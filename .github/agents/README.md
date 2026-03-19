# Test Scenario Generator Agent

A custom Copilot agent for generating realistic K6 load test scripts and expected RCA report JSONs to validate RCA AI agents.

## Purpose

This agent automates the process of:
1. Creating realistic load test scenarios that simulate production incidents
2. Generating K6 test scripts with time-based issue progression
3. Producing expected RCA report JSONs with detailed findings for validation

## How to Use

### Method 1: Agent Selector (Recommended)

1. Open the agent selector in GitHub Copilot Chat
2. Type `@test-scenario-generator` or select "Test Scenario Generator" from the list
3. Describe your scenario requirement

Example:
```
@test-scenario-generator Create a scenario where a memory leak causes gradual OOM errors, 
starting after 1 minute and reaching critical state at 4 minutes, with partial recovery at 6 minutes
```

### Method 2: Natural Language

Just describe your need and the main Copilot agent will delegate to this agent:

```
I need a load test that simulates a database connection pool exhaustion 
with cascading auth failures. It should start normal, degrade over 2 minutes, 
peak for 1 minute, then recover.
```

## What to Provide

Be specific about:
- **Issue type**: Database slow, auth failures, memory leak, cache invalidation, etc.
- **Timeline**: When issues start, peak, and recover
- **Severity**: Latency values (ms), error rates (%), affected percentage
- **Pattern**: Gradual or sudden? Single issue or cascading?
- **Recovery**: Full, partial, or none?

### Example Requirements

**Simple Scenario:**
```
Create a test where backend latency increases from 1s to 10s over 3 minutes, 
affecting 20% of requests, then drops to 2s
```

**Complex Scenario:**
```
Simulate a database overload starting at 30s:
- DB latency increases 2s→15s over 3 minutes
- Auth failures start at 1min (5%), reach 25% at 3min
- Connection pool exhaustion at 2min (8% 503 errors)
- Peak at 3-4min with multiple service failures
- Recovery at 5min but not complete (500ms residual latency)
```

**Realistic Production Incident:**
```
Simulate a cache invalidation storm:
- Redis connection spike at 1min causes 10% timeouts
- Frontend starts failing to load user sessions (15% 401)
- Backend overwhelmed with cache miss queries (latency 500ms→5s)
- CDN cache getting bypassed, increased origin load
- Peak at 3min, recovery at 4min after cache TTL expires
```

## Output

The agent will create two files:

### 1. K6 Test Script
- Location: `test_data/<number>-<descriptive-name>.js`
- Contains: Realistic load test with time-based issue progression
- Features: Proper endpoint groups, metrics, traffic patterns, checks

### 2. Expected RCA Report JSON
- Location: `test_data/expected_rca_report_<number>.json`
- Contains: Detailed findings an RCA agent should detect
- Includes: Severity, issues, causes, suggestions, timeline, root cause analysis

## Agent Capabilities

✅ **Creates realistic scenarios** - Not just synthetic errors, but real production patterns  
✅ **Time-based progression** - Issues evolve gradually over minutes  
✅ **Cascading failures** - Models how issues spread across services  
✅ **Multiple traffic types** - Normal requests + affected requests  
✅ **Proper correlation** - Script timelines match JSON findings exactly  
✅ **Actionable RCA reports** - Detailed root cause analysis with evidence  

## What Makes a Good Scenario

### ✅ DO:
- Use gradual degradation (30s-3min ramp-up)
- Mix normal and affected traffic (70-90% normal, 10-30% issues)
- Create cascading effects (DB slow → auth failures → server errors)
- Include recovery patterns
- Use realistic API endpoint names (users, products, orders)
- Specify exact timelines and metrics

### ❌ DON'T:
- Create instant 100% failures (unrealistic)
- Use only `/api/test` endpoint (too synthetic)
- Skip the timeline (static failures are boring)
- Ignore cascading effects (real incidents spread)
- Create misaligned script and JSON (numbers must match)

## API Capabilities

The agent has full context about the repository and knows:

### Available Query Parameters
- `delay` (0-30000 ms) - Artificial latency
- `status` (200-599) - HTTP status override
- `size` (1-10000 KB) - Response payload size
- `errorType` (db|auth|rateLimit|notFound|badRequest|timeout) - Semantic errors
- `errorRate` (0.0-1.0) - Random error injection rate
- `imageCount` (0-100) - Generate image URLs
- `slowAssets` (true/false) - Slow asset loading

### Catch-All Routing
**Any endpoint path works**: `/api/users`, `/api/products`, `/api/anything` all return the same controllable mock response.

### Realistic Endpoint Groups
The agent will use service-oriented names:
- **User Service**: `/api/users`, `/api/profile`, `/api/settings`
- **Auth Service**: `/api/auth/login`, `/api/auth/validate`
- **Product Service**: `/api/products`, `/api/search`, `/api/categories`
- **Order Service**: `/api/orders`, `/api/cart`, `/api/checkout`
- **Analytics Service**: `/api/analytics`, `/api/metrics`, `/api/reports`

### Existing Test Scenarios
The agent knows about all 12 existing test scenarios and will number new tests as 13, 14, etc.

## Examples from Repository

Check these reference scenarios:
- `test_data/12-realistic-mixed-issues.js` - Complex cascading failures
- `test_data/k6-script1.js` - Progressive backend latency
- `test_data/expected_rca_report_12.json` - Comprehensive RCA report structure

## Validation Workflow

Once files are created:
1. Review the K6 script for realism and timeline accuracy
2. Run the load test: `k6 run test_data/<number>-<name>.js`
3. Collect metrics and RCA agent output
4. Compare against `expected_rca_report_<number>.json`
5. Evaluate RCA agent accuracy (did it find the issues?)

## Troubleshooting

**Agent not appearing?**
- Restart VS Code to load the new agent
- Check file location: `.github/agents/test-scenario-generator.agent.md`

**Agent gives generic response?**
- Be more specific in your requirement
- Mention timeline durations and error percentages
- Use trigger words: "simulate", "incident", "scenario", "load test"

**Script doesn't match JSON?**
- Report this to the agent - it should maintain consistency
- Check if delay values in script match latency in JSON
- Verify error rates align between script and JSON findings

## Tips for RCA Validation

When using generated scenarios to test your RCA agent:

1. **Root Cause Identification**: Does RCA find the primary cause?
2. **Cascading Effect Detection**: Does it see Issue A → Issue B chains?
3. **Timeline Accuracy**: Does it identify when issues started/peaked?
4. **Severity Assessment**: Does it classify Critical vs High vs Medium correctly?
5. **Evidence-Based**: Does it provide supporting data/metrics?
6. **Actionable Recommendations**: Are suggestions specific and practical?

## Contributing

Found a pattern that works well? Add it as a reference example in the agent description or update this README!

---

**Ready to generate test scenarios?** Just mention your requirement to Copilot and watch the agent create both script and expected findings! 🎯
