const tierRoleMap = {
  store: 'store_manager',
  command: 'system_admin'
};

function readOpsProfile(req) {
  const tier = req.header('x-ops-tier') || 'guest';
  const role = req.header('x-ops-role') || tierRoleMap[tier] || 'guest';
  const storeIds = (req.header('x-store-ids') || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

  return {
    tier,
    role,
    storeIds: role === 'system_admin' ? ['*'] : storeIds
  };
}

function requireOpsAuth(req, res, next) {
  const profile = readOpsProfile(req);
  if (profile.tier === 'guest' || profile.role === 'guest') {
    return res.status(401).json({ success: false, message: 'Operations login required.' });
  }
  req.opsProfile = profile;
  next();
}

function requireCommand(req, res, next) {
  if (!req.opsProfile) req.opsProfile = readOpsProfile(req);
  if (req.opsProfile.role !== 'system_admin' && req.opsProfile.tier !== 'command') {
    return res.status(403).json({ success: false, message: 'Command tier only.' });
  }
  next();
}

function canAccessStore(profile, storeId) {
  return profile.role === 'system_admin' || profile.storeIds.includes('*') || profile.storeIds.includes(storeId);
}

module.exports = {
  readOpsProfile,
  requireOpsAuth,
  requireCommand,
  canAccessStore
};
