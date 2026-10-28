"""
Groq API integration layer for AI-Based 5G Digital Twin Network Simulator.

This module integrates Groq API (Llama 3) for strategic decision-making and
natural language explainability of allocation decisions.
"""

import json
import os
from typing import Optional, Dict
import httpx

from models import (
    NetworkState,
    AllocationDecision,
    StrategyRecommendation,
    UserType
)


class GroqOverrideLayer:
    """
    Integrates Groq API for strategic insights and explainability.
    
    Periodically sends network state to Groq API (every 50 ticks) to receive
    strategic recommendations for allocation adjustments. Generates natural
    language explanations for allocation decisions.
    
    The layer operates in two modes:
    - Enabled: GROQ_API_KEY is set, API calls are made
    - Disabled: GROQ_API_KEY not set, graceful degradation with placeholder messages
    
    Features:
    - Strategic evaluation every 50 simulation ticks
    - Dynamic weight updates for AI allocator
    - Natural language explanation generation
    - Graceful error handling and fallback behavior
    """
    
    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
    MODEL_NAME = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Groq Override Layer.
        
        Args:
            api_key: Groq API key. If None, attempts to load from environment.
                    If not found, operates in disabled mode.
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.enabled = self.api_key is not None
        self.client = httpx.AsyncClient(timeout=30.0) if self.enabled else None
        self.override_interval = 50  # Evaluate every 50 ticks
        self.last_explanation = (
            "Multi-objective allocation active. Demands are demand-capped via water-fill to prevent waste and maximize network utilization."
        )
        self.call_in_progress = False  # Flag to prevent concurrent calls
        self.last_valid_weights: Optional[Dict[UserType, float]] = None  # Fallback weights
    
    async def evaluate_strategy(
        self,
        network_state: NetworkState,
        tick: int,
        ai_allocator
    ) -> Optional[StrategyRecommendation]:
        """
        Send network state to Groq API for strategic evaluation.
        
        Called every 50 ticks to receive AI recommendations for allocation
        strategy adjustments. Updates the AI allocator's priority weights
        based on the recommendations.
        
        Args:
            network_state: Current network state snapshot.
            tick: Current simulation tick number.
            ai_allocator: Reference to AIAllocator instance for weight updates.
        
        Returns:
            StrategyRecommendation if evaluation performed, None otherwise.
            Returns None if not time to evaluate or if disabled.
        """
        # Check if it's time to evaluate
        if tick % self.override_interval != 0:
            return None
        
        # If disabled, build a rule-based explanation from RL learning stats
        if not self.enabled:
            rl_allocator = getattr(ai_allocator, '_rl_ref', None)
            self.last_explanation = self._build_rule_based_explanation(network_state, tick)
            return None
        
        # Skip if a call is already in progress (don't queue)
        if self.call_in_progress:
            print(f"Groq call already in progress at tick {tick}, skipping")
            return None
        
        self.call_in_progress = True
        
        try:
            # Format prompt for Groq API
            prompt = self._format_prompt(network_state)
            
            # Call Groq API with retry logic
            response = await self._call_groq_api_with_retry(prompt)
            
            if response is None:
                # All retries failed, use last valid weights if available
                if self.last_valid_weights:
                    print("Using last valid weights after Groq API failure")
                return None
            
            # Parse response
            recommendation = self._parse_response(response, network_state.timestamp)
            
            if recommendation:
                # Validate weights before applying
                if self._validate_weights(recommendation.priority_adjustments):
                    # Update AI allocator weights
                    ai_allocator.update_weights(recommendation.priority_adjustments)
                    self.last_strategy = recommendation
                    self.last_explanation = recommendation.reasoning
                    self.last_valid_weights = recommendation.priority_adjustments.copy()
                else:
                    print("Invalid weights received from Groq, skipping update")
                    return None
            
            return recommendation
            
        except Exception as e:
            # Graceful degradation: log error and continue simulation
            print(f"Groq API error: {e}")
            return None
        finally:
            self.call_in_progress = False
    
    async def generate_explanation(
        self,
        allocation_decision: AllocationDecision,
        network_state: NetworkState
    ) -> str:
        """
        Generate natural language explanation for allocation decision.
        
        Args:
            allocation_decision: The allocation decision to explain.
            network_state: Current network state context.
        
        Returns:
            Natural language explanation string.
            Returns placeholder if disabled or on error.
        """
        if not self.enabled:
            return "Groq API not configured"
        
        # Return last explanation if available
        if self.last_explanation:
            return self.last_explanation
        
        try:
            prompt = self._format_explanation_prompt(allocation_decision, network_state)
            response = await self._call_groq_api(prompt)
            explanation = response.get("content", "No explanation available")
            self.last_explanation = explanation
            return explanation
            
        except Exception as e:
            print(f"Groq API error generating explanation: {e}")
            return "Explanation unavailable due to API error"
    
    def _format_prompt(self, network_state: NetworkState) -> str:
        """
        Format network state as structured prompt for Groq API.
        
        Explicitly asks Llama 3 to return JSON with priority weight suggestions
        alongside natural language explanation.
        
        Args:
            network_state: Current network state snapshot.
        
        Returns:
            Formatted prompt string.
        """
        # Extract key metrics
        baseline_qos = network_state.baseline_result.qos_score
        ai_qos = network_state.ai_result.qos_score
        congestion = network_state.congestion_level * 100
        
        # Per-user-type metrics from AI allocator
        ai_metrics = network_state.ai_result.metrics
        
        prompt = f"""You are an expert 5G network optimization AI. Analyze the current network state and provide strategic recommendations for bandwidth allocation.

Current Network State (Tick {network_state.tick}):
- Total Bandwidth: {network_state.config.total_bandwidth} Mbps
- Congestion Level: {congestion:.1f}%
- Base Latency: {network_state.config.base_latency} ms
- Packet Loss Rate: {network_state.config.packet_loss_rate}%

Current Performance:
- Baseline Allocator QoS: {baseline_qos:.2f}
- AI Allocator QoS: {ai_qos:.2f}

Per-User-Type Metrics (AI Allocator):
"""
        
        for user_type, metrics in ai_metrics.items():
            allocation = network_state.ai_result.decision.allocations[user_type]
            demand = network_state.demands[user_type].bandwidth_demand
            prompt += f"""
- {user_type.value}:
  - Allocated: {allocation:.2f} Mbps (Demand: {demand:.2f} Mbps)
  - Latency: {metrics.latency:.2f} ms
  - Throughput: {metrics.throughput:.2f} Mbps
  - Packet Loss: {metrics.packet_loss:.2f}%
"""
        
        prompt += """
Based on this data, provide:
1. Strategic analysis of current allocation performance
2. Recommended priority weight adjustments for the next 50 ticks

IMPORTANT: Return your response in this exact JSON format:
{
  "priority_weights": {
    "online_gaming": <float between 0.5-2.0>,
    "video_streaming": <float between 0.5-2.0>,
    "voip_messaging": <float between 0.5-2.0>,
    "iot_devices": <float between 0.5-2.0>
  },
  "reasoning": "<natural language explanation of your recommendations>",
  "confidence": <float between 0.0-1.0>
}

Consider:
- Gaming requires ultra-low latency (<20ms)
- Video requires high bandwidth
- VoIP requires real-time delivery (<50ms)
- IoT is latency-tolerant
- Higher weights = higher priority
"""
        
        return prompt
    
    def _format_explanation_prompt(
        self,
        allocation_decision: AllocationDecision,
        network_state: NetworkState
    ) -> str:
        """
        Format prompt for generating allocation explanation.
        
        Args:
            allocation_decision: The allocation decision to explain.
            network_state: Current network state context.
        
        Returns:
            Formatted prompt string.
        """
        prompt = f"""Explain the following bandwidth allocation decision in simple terms for a technical audience:

Total Bandwidth: {network_state.config.total_bandwidth} Mbps
Congestion Level: {network_state.congestion_level * 100:.1f}%

Allocations:
"""
        for user_type, bandwidth in allocation_decision.allocations.items():
            demand = network_state.demands[user_type].bandwidth_demand
            prompt += f"- {user_type.value}: {bandwidth:.2f} Mbps (demand: {demand:.2f} Mbps)\n"
        
        prompt += "\nProvide a 2-3 sentence explanation of why this allocation makes sense given the network conditions and user type characteristics."
        
        return prompt
    
    async def _call_groq_api(self, prompt: str) -> Dict:
        """
        Make API call to Groq.
        
        Args:
            prompt: The prompt to send to Groq API.
        
        Returns:
            Dictionary containing the API response.
        
        Raises:
            Exception: On API errors, timeouts, or rate limits.
        """
        if not self.client or not self.api_key:
            raise Exception("Groq API client not initialized")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.MODEL_NAME,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 1000
        }
        
        response = await self.client.post(
            self.GROQ_API_URL,
            headers=headers,
            json=payload
        )
        
        response.raise_for_status()
        
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        
        return {"content": content}
    
    async def _call_groq_api_with_retry(
        self,
        prompt: str,
        max_retries: int = 3
    ) -> Optional[Dict]:
        """
        Retry with exponential backoff.
        
        - Attempt 1: immediate
        - Attempt 2: wait 2 seconds
        - Attempt 3: wait 4 seconds
        - All attempts failed: return None, log error, use last valid weights
        
        Handle specifically:
        - httpx.TimeoutException: retry
        - HTTP 429 (rate limit): wait 10 seconds then retry
        - HTTP 500/503: retry with backoff
        - HTTP 400 (bad request): do NOT retry, return None immediately
        - JSON parse error: do NOT retry, return None
        
        Args:
            prompt: The prompt to send to Groq API
            max_retries: Maximum number of retry attempts
        
        Returns:
            Dictionary containing API response, or None if all retries failed
        """
        import asyncio
        
        for attempt in range(max_retries):
            try:
                response = await self._call_groq_api(prompt)
                return response
                
            except httpx.TimeoutException as e:
                print(f"Groq API timeout (attempt {attempt + 1}/{max_retries}): {e}")
                if attempt < max_retries - 1:
                    wait_time = 2 ** attempt  # Exponential backoff: 1, 2, 4 seconds
                    await asyncio.sleep(wait_time)
                else:
                    print("All retry attempts exhausted due to timeout")
                    return None
                    
            except httpx.HTTPStatusError as e:
                status_code = e.response.status_code
                
                # HTTP 400: Bad request - do NOT retry
                if status_code == 400:
                    print(f"Groq API bad request (400): {e}")
                    return None
                
                # HTTP 429: Rate limit - wait longer then retry
                elif status_code == 429:
                    print(f"Groq API rate limit (429) (attempt {attempt + 1}/{max_retries})")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(10)  # Wait 10 seconds for rate limit
                    else:
                        print("All retry attempts exhausted due to rate limit")
                        return None
                
                # HTTP 500/503: Server error - retry with backoff
                elif status_code in [500, 503]:
                    print(f"Groq API server error ({status_code}) (attempt {attempt + 1}/{max_retries})")
                    if attempt < max_retries - 1:
                        wait_time = 2 ** attempt
                        await asyncio.sleep(wait_time)
                    else:
                        print("All retry attempts exhausted due to server error")
                        return None
                
                # Other HTTP errors - do NOT retry
                else:
                    print(f"Groq API HTTP error ({status_code}): {e}")
                    return None
                    
            except json.JSONDecodeError as e:
                # JSON parse error - do NOT retry
                print(f"Groq API JSON parse error: {e}")
                return None
                
            except Exception as e:
                # Unexpected error - log and do NOT retry
                print(f"Groq API unexpected error: {e}")
                return None
        
        return None
    
    def _validate_weights(self, weights: Dict[UserType, float]) -> bool:
        """
        Validate recommended weights before applying.
        
        Return False if any weight is outside 0.3-3.0 range
        Return False if any user type key is missing
        Return False if weights dict is empty
        
        Args:
            weights: Dictionary mapping UserType to weight values
        
        Returns:
            True if weights are valid, False otherwise
        """
        # Check if empty
        if not weights:
            return False
        
        # Check if all user types present
        if len(weights) != len(UserType):
            return False
        
        # Check if all user types are present
        for user_type in UserType:
            if user_type not in weights:
                return False
        
        # Check if all weights are in valid range
        for user_type, weight in weights.items():
            if not isinstance(weight, (int, float)):
                return False
            if weight < 0.3 or weight > 3.0:
                return False
        
        return True
    
    def _parse_response(
        self,
        response: Dict,
        timestamp: float
    ) -> Optional[StrategyRecommendation]:
        """
        Parse Groq API response into strategy recommendation.
        
        Extracts priority weight suggestions from JSON response.
        If parsed weights are invalid or missing, returns None for graceful degradation.
        
        Args:
            response: Dictionary containing API response.
            timestamp: Current timestamp.
        
        Returns:
            StrategyRecommendation if parsing successful, None otherwise.
        """
        try:
            content = response.get("content", "")
            
            # Try to extract JSON from response
            # Look for JSON block in markdown code fence or raw JSON
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                json_str = content[json_start:json_end].strip()
            elif "```" in content:
                json_start = content.find("```") + 3
                json_end = content.find("```", json_start)
                json_str = content[json_start:json_end].strip()
            elif "{" in content and "}" in content:
                json_start = content.find("{")
                json_end = content.rfind("}") + 1
                json_str = content[json_start:json_end]
            else:
                # No JSON found, graceful degradation
                return None
            
            data = json.loads(json_str)
            
            # Extract priority weights
            priority_weights_raw = data.get("priority_weights", {})
            
            # Map string keys to UserType enum
            priority_adjustments = {}
            for key, value in priority_weights_raw.items():
                try:
                    user_type = UserType(key)
                    # Validate weight is in reasonable range
                    if 0.5 <= value <= 2.0:
                        priority_adjustments[user_type] = float(value)
                except (ValueError, TypeError):
                    continue
            
            # Require all user types to have weights
            if len(priority_adjustments) != len(UserType):
                return None
            
            reasoning = data.get("reasoning", "No reasoning provided")
            confidence = float(data.get("confidence", 0.5))
            confidence = max(0.0, min(1.0, confidence))  # Clamp to 0-1
            
            return StrategyRecommendation(
                priority_adjustments=priority_adjustments,
                reasoning=reasoning,
                confidence=confidence,
                timestamp=timestamp
            )
            
        except (json.JSONDecodeError, KeyError, ValueError, TypeError) as e:
            print(f"Error parsing Groq response: {e}")
            return None
    
    def _build_rule_based_explanation(self, network_state: "NetworkState", tick: int) -> str:
        """
        Generate a rule-based explainability message when Groq is not configured.

        Reads RL learning stats from the rl_result in network_state to describe
        what the RL agent has learned so far. (Presentation change)

        Args:
            network_state: Current network state snapshot.
            tick: Current simulation tick.

        Returns:
            Human-readable string describing current RL strategy.
        """
        try:
            rl = network_state.rl_result
            if rl is None:
                return (
                    f"[Rule-based, tick {tick}] "
                    "RL allocator is warming up — no data yet."
                )

            util = rl.utilization
            qos = rl.qos_score

            # Describe congestion
            congestion_pct = network_state.congestion_level * 100
            congestion_desc = (
                "low" if congestion_pct < 40
                else "moderate" if congestion_pct < 70
                else "high"
            )

            return (
                f"[Rule-based insight, tick {tick}] "
                f"Network congestion is {congestion_desc} ({congestion_pct:.1f}% of capacity). "
                f"RL allocator achieved QoS={qos:.1f} and "
                f"utilization={util:.1f}%. "
                f"The RL agent optimises J = 0.7×(QoS/100) + 0.3×(utilisation/100) "
                f"relative to the baseline equal-split. "
                f"Bandwidth is demand-capped and spare capacity is redistributed via water-fill, "
                f"so no application receives more than it requests. "
                f"(Add GROQ_API_KEY to enable LLM-powered explanations.)"
            )
        except Exception:
            return (
                f"[Rule-based, tick {tick}] "
                "RL is learning. Add GROQ_API_KEY for LLM-powered insights."
            )

    async def close(self):
        """Close the HTTP client."""
        if self.client:
            await self.client.aclose()
