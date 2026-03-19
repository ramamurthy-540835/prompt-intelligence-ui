# Vertex AI Agent Engine - Complete Deployment Examples

Welcome! This directory contains everything you need to deploy AI agents to Google Cloud Vertex AI Agent Engine.

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Set your Google Cloud project
export GCP_PROJECT_ID="your-project-id"

# 2. Run quick start
bash quickstart.sh

# Done! Your first agent is now live.
```

**That's it!** Your agent is deployed and ready to use.

---

## 📚 Documentation

### For Beginners
👉 **Start here:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- Common commands
- Quick setup
- Basic troubleshooting

### For Complete Guide
👉 **Read this:** [VERTEX_AI_AGENT_DEPLOYMENT_GUIDE.md](../VERTEX_AI_AGENT_DEPLOYMENT_GUIDE.md)
- Full documentation
- Prerequisites
- Multiple examples
- Best practices

---

## 📂 Files in This Directory

| File | Purpose |
|------|---------|
| `quickstart.sh` | One-click deployment (recommended for first-time) |
| `simple_hello_agent.py` | Beginner-friendly example |
| `advanced_data_agent.py` | Production-grade example |
| `requirements.txt` | Python dependencies |
| `QUICK_REFERENCE.md` | Cheat sheet & quick commands |
| `README.md` | This file |

---

## 🎯 Three Ways to Deploy

### Way 1: Quick Start (Easiest)
```bash
bash quickstart.sh
```
- ✅ Fully automated
- ✅ Single command
- ✅ Perfect for beginners

### Way 2: Python Script (Recommended)
```bash
export AGENT_NAME="my-agent"
python3 simple_hello_agent.py
```
- ✅ Easy to understand
- ✅ Easy to customize
- ✅ Good for learning

### Way 3: Advanced Script (Production)
```bash
export GCP_PROJECT_ID="your-project"
export AGENT_NAME="production-agent"
python3 advanced_data_agent.py
```
- ✅ Logging and error handling
- ✅ Configuration validation
- ✅ Production ready

---

## 📖 Examples

### Example 1: Simple Hello Agent

A basic agent perfect for learning.

```bash
python3 simple_hello_agent.py
```

**What it does:**
- Initializes Vertex AI
- Creates a simple agent
- Displays deployment details

**Time to deploy:** ~3 minutes

---

### Example 2: Advanced Data Agent

A sophisticated agent with logging and error handling.

```bash
export GCP_PROJECT_ID="ctoteam"
python3 advanced_data_agent.py
```

**What it does:**
- Full validation
- Professional logging
- Error handling
- Production-grade code

**Time to deploy:** ~3 minutes

---

## 🔧 Setup Guide

### Step 1: Install Prerequisites

```bash
# Update package manager
pip install --upgrade pip

# Install Google Cloud SDK
# Visit: https://cloud.google.com/sdk/docs/install

# Install Python packages
pip install -r requirements.txt
```

### Step 2: Configure GCP

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
export GCP_PROJECT_ID="your-project-id"
gcloud config set project $GCP_PROJECT_ID --quiet

# Verify
gcloud config get-value project
```

### Step 3: Enable APIs

```bash
# Enable Vertex AI
gcloud services enable aiplatform.googleapis.com --quiet

# Verify
gcloud services list --enabled | grep aiplatform
```

### Step 4: Deploy Agent

Choose one:

```bash
# Option A: Quick start (recommended)
bash quickstart.sh

# Option B: Simple agent
python3 simple_hello_agent.py

# Option C: Advanced agent
python3 advanced_data_agent.py
```

---

## ✅ Verification

After deployment:

### 1. Check Cloud Console
```
https://console.cloud.google.com/vertex-ai/agent-builder?project=YOUR_PROJECT_ID
```

You should see your agent listed.

### 2. List Agents via CLI
```bash
gcloud ai agents list --location=us-central1
```

### 3. Get Agent Details
```bash
gcloud ai agents describe AGENT_ID --location=us-central1
```

---

## 🎓 Learning Path

**New to Vertex AI?** Follow this order:

1. **Read:** [QUICK_REFERENCE.md](QUICK_REFERENCE.md) (5 min)
2. **Deploy:** Run `bash quickstart.sh` (5 min)
3. **View:** Check Cloud Console (1 min)
4. **Learn:** Read [Full Guide](../VERTEX_AI_AGENT_DEPLOYMENT_GUIDE.md) (20 min)
5. **Practice:** Try both Python examples (20 min)
6. **Customize:** Modify examples for your use case (30 min)

**Total time:** ~1.5 hours to be productive

---

## 🚨 Troubleshooting

### Issue: "Auth error" or "not authenticated"

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project your-project-id
```

### Issue: "API not enabled"

```bash
gcloud services enable aiplatform.googleapis.com
```

### Issue: "Permission denied"

```bash
# Add required role to your account
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="user:YOUR_EMAIL" \
  --role="roles/aiplatform.user"
```

### Issue: "ImportError" for vertexai

```bash
pip install --upgrade google-cloud-aiplatform
python3 -c "import vertexai; print('✓ OK')"
```

### Issue: Deployment timeout

Deployments take **2-3 minutes**. This is normal! Check status in:
```
https://console.cloud.google.com/vertex-ai/agent-builder
```

---

## 📊 What Gets Created

When you deploy an agent:

```
Google Cloud Project
└── Vertex AI
    └── Agent Engine
        └── Your Agent
            ├── Display Name: my-agent
            ├── Resource ID: projects/.../agents/...
            ├── Region: us-central1
            └── Status: ACTIVE
```

---

## 💡 Pro Tips

1. **Use environment variables** for different deployments
```bash
export AGENT_NAME="production-agent"
python3 simple_hello_agent.py
```

2. **Check logs for debugging**
```bash
gcloud logging read "resource.type=aiplatform.googleapis.com"
```

3. **Name agents clearly**
```
✓ sales-analysis-agent
✓ customer-support-bot
✓ data-processor-v1

✗ agent1
✗ test
✗ my-thing
```

4. **Delete agents you don't need**
```bash
gcloud ai agents delete AGENT_ID --location=us-central1
```

5. **Monitor usage in Cloud Console**
Go to: Monitoring → Dashboards

---

## 🔗 Useful Links

| Resource | Link |
|----------|------|
| **Cloud Console** | https://console.cloud.google.com/vertex-ai |
| **Documentation** | https://cloud.google.com/vertex-ai/docs/agents |
| **Python SDK** | https://cloud.google.com/python/docs/reference/vertexai |
| **Pricing** | https://cloud.google.com/vertex-ai/pricing |
| **Support** | https://cloud.google.com/support |

---

## 📋 Checklists

### Deployment Checklist

- [ ] GCP project created and billing enabled
- [ ] gcloud CLI installed and logged in
- [ ] Python 3.8+ installed
- [ ] Dependencies installed: `pip install -r requirements.txt`
- [ ] APIs enabled: `gcloud services enable aiplatform.googleapis.com`
- [ ] Environment variables set (GCP_PROJECT_ID, etc.)
- [ ] Agent deployed: `bash quickstart.sh` or `python3 simple_hello_agent.py`
- [ ] Verified in Cloud Console
- [ ] Ready to customize and integrate

---

## 🤝 Contributing

Found a bug or want to improve? Here's how:

1. Test the scripts thoroughly
2. Document any changes
3. Keep examples simple for beginners
4. Update documentation

---

## 📄 License

These examples are provided as-is for educational and deployment purposes.

---

## 🎉 You're Ready!

Everything you need is in this directory:

- **Just starting?** → Run `bash quickstart.sh`
- **Want to learn?** → Read `QUICK_REFERENCE.md`
- **Need details?** → Read `VERTEX_AI_AGENT_DEPLOYMENT_GUIDE.md`
- **Building custom?** → Use `simple_hello_agent.py` as template
- **Production-grade?** → Use `advanced_data_agent.py` as template

## Next Steps

1. **Deploy your first agent** (5 minutes)
```bash
bash quickstart.sh
```

2. **View in Cloud Console** (1 minute)
```
https://console.cloud.google.com/vertex-ai/agent-builder
```

3. **Explore and customize** (ongoing)
- Add tools
- Configure prompts
- Integrate into applications
- Monitor and optimize

---

**Happy deploying!** 🚀

For questions or issues, check:
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for quick answers
- [VERTEX_AI_AGENT_DEPLOYMENT_GUIDE.md](../VERTEX_AI_AGENT_DEPLOYMENT_GUIDE.md) for detailed help
- [Google Cloud Documentation](https://cloud.google.com/vertex-ai/docs)

---

**Last Updated:** March 5, 2026
**Status:** ✅ Production Ready
**Version:** 1.0
