# 🎨 NetPulse AI - Frontend

> Real-time dashboard for visualizing AI-powered 5G network optimization

[![Next.js](https://img.shields.io/badge/Next.js-16.2+-black.svg)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38bdf8.svg)](https://tailwindcss.com/)

## 🌐 Live Demo

**Frontend**: [https://netpulseai.tanisheesh.in](https://netpulseai.tanisheesh.in)

**Backend API**: [https://netpulseai.onrender.com](https://netpulseai.onrender.com)

## 🎯 Overview

A modern, responsive web application built with **Next.js 16** and **React 19** that provides:

- **Real-time visualization** of network simulation data
- **Interactive charts** showing allocation, throughput, and QoS metrics
- **Side-by-side comparison** of Baseline vs AI vs RL strategies
- **WebSocket integration** for live data streaming
- **Responsive design** optimized for desktop and mobile


## ✨ Features

### 📊 Real-time Dashboard
- **Live data streaming** via WebSocket (< 50ms latency)
- **100-tick history** with rolling window
- **Auto-reconnection** with exponential backoff
- **Connection status** indicator

### 📈 Interactive Charts
- **Bandwidth Allocation** - Shows differences between strategies
- **Throughput Over Time** - Actual data transfer rates
- **QoS Score by User Type** - Per-user quality comparison
- Built with **Recharts** for smooth animations

### 📋 Statistics Table
- **Rolling averages** over last 50 ticks
- **4 key metrics** per user type
- **Color-coded highlights** for better performance
- **Allocation Efficiency** metric (35% weight)

### 🎛️ Configuration Panel
- **Network parameters** adjustment
- **Random seed** for reproducibility
- **Real-time validation**
- **Disabled during simulation**

### 🎨 Modern UI/UX
- **Dark theme** with gradient accents
- **Smooth animations** and transitions
- **Responsive layout** (mobile-first)
- **Accessibility compliant**

## 🧩 Components

### Core Components

#### `useWebSocket` Hook
```typescript
const { networkState, connectionStatus, error } = useWebSocket();
```
- Manages WebSocket connection
- Auto-reconnection with backoff
- Type-safe data parsing
- Connection status tracking

#### `ChartsSection`
```typescript
<ChartsSection history={history} />
```
- Container for all charts
- Data transformation
- Memoized calculations
- Responsive grid layout

#### `StatisticsTable`
```typescript
<StatisticsTable history={history} />
```
- Rolling averages (last 50 ticks)
- 4 metrics per user type
- Color-coded highlights
- Supports 3 allocators

#### `ComparisonPanels`
```typescript
<ComparisonPanels
  baselineAllocations={...}
  aiAllocations={...}
  rlAllocations={...}
  baselineQoS={...}
  aiQoS={...}
  rlQoS={...}
/>
```
- Side-by-side comparison
- Allocation bars
- QoS scores
- VS badge (2-panel mode)

#### `Footer`
```typescript
<Footer />
```
- Reusable across all pages
- Real-time health check
- Dynamic status indicator
- GitHub link

## 📊 Performance

### Optimization Techniques

- **Code splitting** - Automatic with Next.js
- **Image optimization** - Next.js Image component
- **Memoization** - useMemo for expensive calculations
- **Lazy loading** - Dynamic imports for heavy components
- **WebSocket pooling** - Single connection shared across components

### Lighthouse Scores

Target scores:
- Performance: 95+
- Accessibility: 100
- Best Practices: 100
- SEO: 100