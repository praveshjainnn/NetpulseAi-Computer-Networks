# 🚀 NetPulse AI - Backend

> Real-time 5G network simulation engine with AI-powered bandwidth allocation

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green.svg)](https://fastapi.tiangolo.com/)
[![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-orange.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🎯 Overview

The backend is a high-performance simulation engine built with **FastAPI** that:

- Executes network simulations at **100ms tick intervals**
- Compares **3 allocation strategies** simultaneously (Baseline, AI, RL)
- Streams real-time data via **WebSocket**
- Provides **REST API** for simulation control
- Stores historical data in **SQLite/Supabase**
- Integrates **Groq AI** for intelligent decision-making


## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   REST API   │  │  WebSocket   │  │  Health API  │      │
│  │   Endpoints  │  │   Streaming  │  │    /health   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    Simulation Engine                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Traffic Generators (4 types)             │   │
│  │  Video │ Gaming │ IoT │ VoIP                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Allocation Strategies (3 types)             │   │
│  │  Baseline │ AI Weighted │ RL Multi-Armed Bandit      │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Metrics Calculation                      │   │
│  │  Latency │ Throughput │ Packet Loss │ Efficiency     │   │
│  └──────────────────────────────────────────────────────┘   │
│                           ↓                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                QoS Score Calculation                  │   │
│  │  Formula: 25% + 25% + 15% + 35% (weighted)           │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                    Database Layer                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │    SQLite    │  │   Supabase   │                         │
│  │   (Local)    │  │   (Cloud)    │                         │
│  └──────────────┘  └──────────────┘                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```


## ✨ Features

### 🎮 Simulation Engine
- **100ms tick rate** - Real-time network simulation
- **Deterministic** - Same seed produces same results
- **Concurrent execution** - All 3 strategies run in parallel
- **Fair comparison** - Same demand snapshot for all allocators

### 🤖 AI Integration
- **Groq API** - Powered by Llama 3 for strategic recommendations
- **Weighted Priority** - Smart allocation based on user type characteristics
- **Reinforcement Learning** - Multi-armed bandit algorithm that learns optimal strategy

### 📊 Metrics & Analytics
- **Real-time QoS scoring** - Weighted formula (25-25-15-35)
- **Historical tracking** - Rolling averages and trends
- **Performance comparison** - Baseline vs AI vs RL

### 🔌 API & Connectivity
- **REST API** - Full CRUD operations for simulation control
- **WebSocket** - Real-time data streaming (< 50ms latency)
- **Swagger UI** - Interactive API documentation at `/docs`
- **Health checks** - System status monitoring

### 💾 Data Persistence
- **SQLite** - Local development database
- **Supabase** - Cloud database for production
- **Snapshots** - Periodic state saves every 5 ticks
- **Export** - CSV/JSON data export capabilities

### Simulation Parameters

Default configuration (can be changed via API):

```python
{
    "total_bandwidth": 100.0,      # Mbps
    "base_latency": 10.0,          # ms
    "congestion_factor": 1.5,      # multiplier
    "packet_loss_rate": 2.0,       # percentage
    "random_seed": 42              # for reproducibility
}
```

## 📚 API Documentation

### Interactive Docs

- **Swagger UI**: [https://netpulseai.onrender.com/docs](https://netpulseai.onrender.com/docs)
- **ReDoc**: [https://netpulseai.onrender.com/redoc](https://netpulseai.onrender.com/redoc)
- **Health Check**: [https://netpulseai.onrender.com/api/health](https://netpulseai.onrender.com/api/health)

### Local Development

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📊 Metrics Explained

### QoS Score Formula

```python
QoS = (throughput_score × 0.25) +
      (latency_score × 0.25) +
      (packet_retention × 0.15) +
      (allocation_efficiency × 0.35)
```

### Key Metrics

| Metric | Description | Better |
|--------|-------------|--------|
| **Throughput** | Actual data transfer rate (Mbps) | Higher ↑ |
| **Latency** | Network delay (ms) | Lower ↓ |
| **Packet Loss** | Percentage of lost packets | Lower ↓ |
| **Allocation Efficiency** | How smartly bandwidth is used | Higher ↑ |