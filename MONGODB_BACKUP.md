# MongoDB Atlas Backup Setup Guide

## 🔴 CRITICAL: Production Requirement

MongoDB Atlas backups are **MANDATORY** for production. Without them, you risk **catastrophic data loss**.

---

## Option 1: Automatic Cloud Backups (Recommended)

### M10+ Clusters (Paid)

Atlas provides automatic continuous backups for M10+ clusters:

✅ **Included features:**
- Point-in-time recovery (last 24 hours)
- Snapshot every 6-24 hours
- Configurable retention (7 days to years)
- One-click restore

### Setup Steps:

1. **Access Atlas Dashboard**
   - Go to [cloud.mongodb.com](https://cloud.mongodb.com)
   - Select your project
   - Click on your cluster

2. **Enable Backups**
   - Navigate to **"Backup"** tab
   - Click **"Enable Cloud Backup"**
   - Configure settings:
     - **Snapshot frequency**: Every 6, 12, or 24 hours
     - **Retention**: 7 days (minimum), 30 days (recommended)
     - **Point-in-time**: Enable for critical data

3. **Verify Backup Schedule**
   - Go to **"Backup" → "Snapshots"**
   - Verify first snapshot is created
   - Check next scheduled backup time

4. **Test Restore (IMPORTANT)**
   - Download a snapshot
   - Restore to a test cluster
   - Verify data integrity

### Cost (M10 Cluster Example):
- **M10 cluster**: ~$57/month (includes backups)
- **Storage**: $2.50/GB/month (beyond included)

---

## Option 2: Free Tier Workaround (M0)

M0 (free tier) **does NOT include** automatic backups. Use these alternatives:

### A. Manual Exports (Not Recommended for Production)

**⚠️ WARNING**: Only for development/testing

```bash
# Export entire database
mongodump --uri="mongodb+srv://user:pass@cluster.mongodb.net/voxelpromo" --out=./backup

# Compress backup
tar -czf backup-$(date +%Y%m%d).tar.gz ./backup

# Store in cloud storage (S3, Google Drive, etc.)
```

**Setup automated script:**

Create `scripts/backup-mongodb.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
MONGODB_URI="${MONGODB_URI}"

mkdir -p $BACKUP_DIR
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/backup-$DATE"
tar -czf "$BACKUP_DIR/backup-$DATE.tar.gz" "$BACKUP_DIR/backup-$DATE"
rm -rf "$BACKUP_DIR/backup-$DATE"

# Keep only last 7 backups
ls -t $BACKUP_DIR/*.tar.gz | tail -n +8 | xargs rm -f

echo "Backup completed: backup-$DATE.tar.gz"
```

**Schedule with cron** (Linux):
```bash
# Run daily at 3 AM
0 3 * * * /path/to/scripts/backup-mongodb.sh
```

### B. Upgrade to M2 (~$9/month)

- Cheapest tier with **automated backups**
- Continuous backup with point-in-time recovery
- Production-suitable for small apps

---

## Recommended Setup: Production Checklist

### For M10+ (Paid Clusters):

- [ ] Cloud backups enabled
- [ ] Retention policy: 30+ days
- [ ] Point-in-time recovery enabled
- [ ] First backup verified
- [ ] Restore tested successfully
- [ ] Backup alerts configured (email)

### For M0 (Free Tier - Dev Only):

- [ ] Automated `mongodump` script created
- [ ] Scheduled with cron/Task Scheduler
- [ ] Backups stored in cloud (S3/Drive)
- [ ] Tested restore procedure
- [ ] **Plan upgrade to M2/M10 before launch**

---

## Emergency Restore Procedure

### From Atlas Cloud Backup:

1. Go to **"Backup" → "Snapshots"**
2. Click **"..."** on snapshot → **"Restore"**
3. Choose restore method:
   - **Point-in-time**: Select exact timestamp
   - **Snapshot**: Select specific backup
4. Select destination:
   - New cluster (recommended for testing)
   - Existing cluster (overwrites data)
5. Click **"Restore"**

### From Manual Export:

```bash
# Extract backup
tar -xzf backup-20260109.tar.gz

# Restore to database
mongorestore --uri="mongodb+srv://user:pass@cluster.mongodb.net/voxelpromo" ./backup/voxelpromo

# Verify data
mongo "mongodb+srv://cluster.mongodb.net/voxelpromo" --eval "db.users.count()"
```

---

## Monitoring & Alerts

### Atlas Alerts (Recommended):

1. Go to **"Alerts"** in Atlas
2. Create alert: **"Backup Failed"**
   - Send to: Your email
   - Trigger: When backup fails
3. Create alert: **"Backup Storage Full"**
   - Send to: Your email
   - Trigger: >80% storage used

### Health Check Integration:

Add to `src/routes/health.routes.ts`:

```typescript
// Check last backup timestamp from Atlas API (optional)
GET /api/health/backup -> {
  lastBackup: "2026-01-09T03:00:00Z",
  status: "ok",
  nextScheduled: "2026-01-10T03:00:00Z"
}
```

---

## Cost Comparison

| Tier | Monthly Cost | Backups | Best For |
|------|-------------|---------|----------|
| M0 (Free) | $0 | ❌ None (manual only) | Development |
| M2 | ~$9 | ✅ Automated | Small apps |
| M10 | ~$57 | ✅ Full featured | Production |
| M20 | ~$140 | ✅ Advanced | High traffic |

---

## Pre-Launch Decision

**Choose ONE before launch:**

### ✅ Option A: Upgrade to M10+ (Recommended)
- Professional-grade backups
- Point-in-time recovery
- Peace of mind
- **Action**: Upgrade cluster in Atlas dashboard

### ⚠️ Option B: M0/M2 with Manual Backup Script
- Cost-saving for MVP
- Requires maintenance
- Higher risk of data loss
- **Action**: Implement `backup-mongodb.sh` + cron

### ❌ Option C: No Backups (NEVER DO THIS)
- **Catastrophic risk**
- Not LGPD compliant
- **DO NOT LAUNCH**

---

## Final Verification

Run this checklist **before production launch**:

```bash
# 1. Verify backup is active
# Atlas Dashboard → Backup → Check "Enabled"

# 2. Check last backup date
# Should be within last 24 hours

# 3. Test restore (to test cluster)
# Confirm data integrity

# 4. Verify alerts configured
# You should receive email when backup completes/fails
```

**✅ READY when all checkboxes are marked.**
