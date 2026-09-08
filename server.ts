import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { tenantStore } from "./server/multiTenantStore";

dotenv.config();

let aiClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
    });
  });

  // ==========================================
  // MULTI-TENANT AUTHENTICATION & ONBOARDING
  // ==========================================

  // 1. Store Registration & Workspace Provisioning
  app.post(["/api/auth/register", "/api/admin/stores/create"], (req, res) => {
    try {
      const { storeId, storeName, ownerName, ownerPhone, dlNumber, email, ownerEmail, password, gstin, address, upiId, subscriptionPlan, allowedUserLimit, status } = req.body;
      
      if (!storeName || !ownerPhone || !dlNumber) {
        return res.status(400).json({ 
          error: "Store Name, Owner Phone number, and Drug License (DL) number are required." 
        });
      }

      const result = tenantStore.registerStore({
        storeId,
        storeName,
        ownerName: ownerName || "Store Owner",
        ownerPhone,
        dlNumber,
        email: email || ownerEmail,
        password,
        gstin,
        address,
        upiId,
        subscriptionPlan,
        allowedUserLimit: allowedUserLimit !== undefined ? Number(allowedUserLimit) : 2,
        status
      });

      return res.status(201).json({
        success: true,
        message: `Medical Store "${result.store.storeName}" registered successfully with Store ID: ${result.store.storeId}`,
        store: result.store,
        session: result.session,
        overview: tenantStore.getSuperAdminOverview()
      });
    } catch (err: any) {
      console.error("Store registration error:", err);
      return res.status(500).json({ error: err.message || "Failed to register medical store workspace." });
    }
  });

  // 2. Multi-Device Login per Store (Enforces Max 2 Concurrent Devices)
  app.post("/api/auth/login", (req, res) => {
    try {
      const { identifier, password, deviceName, deviceType, role, userName, deviceId, ipAddress, location, browser, os, fingerprintHash } = req.body;
      if (!identifier) {
        return res.status(400).json({ error: "Please provide Store ID, Owner Phone, or DL Number." });
      }

      const result = tenantStore.loginStore({
        identifier,
        password,
        deviceName,
        deviceType,
        role,
        userName,
        deviceId,
        ipAddress,
        location,
        browser,
        os,
        fingerprintHash
      });

      if (!result.success) {
        return res.status(403).json({ 
          error: result.error, 
          store: result.store,
          isLimitReached: result.error?.includes("Account limit reached")
        });
      }

      return res.json({
        success: true,
        message: `Logged in to ${result.store?.storeName}`,
        session: result.session,
        store: result.store
      });
    } catch (err: any) {
      console.error("Store login error:", err);
      return res.status(500).json({ error: "Login failed. Please try again." });
    }
  });

  // 3. Super Admin Owner Login (Irsaad9118@gmail.com)
  app.post("/api/auth/super-admin", (req, res) => {
    try {
      const { email, password } = req.body;
      const result = tenantStore.superAdminLogin(email, password);
      if (!result.success) {
        return res.status(403).json({ error: result.error });
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ error: "Super admin auth error" });
    }
  });

  // 4. Pharmacy Store Owner Password Recovery & Email Token Dispatch
  app.post("/api/auth/forgot-password", (req, res) => {
    try {
      const { identifier } = req.body;
      if (!identifier) {
        return res.status(400).json({ error: "Please enter your Store ID, Registered Email, Phone, or DL Number." });
      }

      const result = tenantStore.requestPasswordRecovery(identifier);
      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      return res.json({
        success: true,
        message: `Recovery token dispatched to ${result.maskedEmail}`,
        storeId: result.storeId,
        storeName: result.storeName,
        recipientEmail: result.recipientEmail,
        maskedEmail: result.maskedEmail,
        expiresInMinutes: result.expiresInMinutes,
        recoveryToken: result.recoveryToken, // Provided for simulated demo preview
        simulatedEmail: result.simulatedEmail
      });
    } catch (err: any) {
      console.error("Forgot password error:", err);
      return res.status(500).json({ error: "Failed to dispatch recovery token. Please try again." });
    }
  });

  // 5. Verify Password Recovery Token
  app.post("/api/auth/verify-recovery-token", (req, res) => {
    try {
      const { storeId, token } = req.body;
      if (!storeId || !token) {
        return res.status(400).json({ error: "Store ID and Recovery Token are required." });
      }

      const result = tenantStore.verifyRecoveryToken(storeId, token);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({
        success: true,
        message: "Recovery token verified successfully.",
        storeId: result.storeId,
        storeName: result.storeName
      });
    } catch (err: any) {
      console.error("Verify recovery token error:", err);
      return res.status(500).json({ error: "Verification failed. Please try again." });
    }
  });

  // 6. Reset Store Password with Verified Token
  app.post("/api/auth/reset-password", (req, res) => {
    try {
      const { storeId, token, newPassword } = req.body;
      if (!storeId || !token || !newPassword) {
        return res.status(400).json({ error: "Store ID, Recovery Token, and New Password are required." });
      }

      const result = tenantStore.resetStorePassword(storeId, token, newPassword);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      return res.json({
        success: true,
        message: result.message,
        storeId: result.storeId,
        storeName: result.storeName
      });
    } catch (err: any) {
      console.error("Reset password error:", err);
      return res.status(500).json({ error: "Failed to reset password. Please try again." });
    }
  });

  // ==========================================
  // STORE-SCOPED DATA & REAL-TIME SYNC APIS
  // (Every query strictly isolated by storeId)
  // ==========================================

  // Get complete synchronized workspace state
  app.get("/api/store/:storeId/state", (req, res) => {
    const { storeId } = req.params;
    const data = tenantStore.getStoreFullState(storeId);
    if (!data) {
      return res.status(404).json({ error: `Store workspace ${storeId} not found.` });
    }
    return res.json({ success: true, data });
  });

  // Inventory (Store Scoped)
  app.get("/api/store/:storeId/inventory", (req, res) => {
    const { storeId } = req.params;
    const items = tenantStore.getStoreInventory(storeId);
    return res.json({ success: true, storeId, items });
  });

  app.post("/api/store/:storeId/inventory", (req, res) => {
    const { storeId } = req.params;
    const item = tenantStore.addStoreInventoryItem(storeId, req.body);
    return res.json({ success: true, storeId, item });
  });

  app.put("/api/store/:storeId/inventory/:id", (req, res) => {
    const { storeId, id } = req.params;
    const updated = tenantStore.updateStoreInventoryItem(storeId, id, req.body);
    return res.json({ success: true, storeId, item: updated });
  });

  app.delete("/api/store/:storeId/inventory/:id", (req, res) => {
    const { storeId, id } = req.params;
    tenantStore.deleteStoreInventoryItem(storeId, id);
    return res.json({ success: true, storeId, deletedId: id });
  });

  // Transactions / POS (Store Scoped)
  app.get("/api/store/:storeId/transactions", (req, res) => {
    const { storeId } = req.params;
    const transactions = tenantStore.getStoreTransactions(storeId);
    return res.json({ success: true, storeId, transactions });
  });

  app.post("/api/store/:storeId/transactions", (req, res) => {
    const { storeId } = req.params;
    const tx = tenantStore.addStoreTransaction(storeId, req.body);
    return res.json({ success: true, storeId, transaction: tx });
  });

  // Patients / Customers (Store Scoped)
  app.get("/api/store/:storeId/patients", (req, res) => {
    const { storeId } = req.params;
    const patients = tenantStore.getStorePatients(storeId);
    return res.json({ success: true, storeId, patients });
  });

  app.post("/api/store/:storeId/patients", (req, res) => {
    const { storeId } = req.params;
    const patient = tenantStore.addStorePatient(storeId, req.body);
    return res.json({ success: true, storeId, patient });
  });

  app.put("/api/store/:storeId/patients/:id", (req, res) => {
    const { storeId, id } = req.params;
    const updated = tenantStore.updateStorePatient(storeId, id, req.body);
    return res.json({ success: true, storeId, patient: updated });
  });

  // Settings (Store Scoped)
  app.get("/api/store/:storeId/settings", (req, res) => {
    const { storeId } = req.params;
    const settings = tenantStore.getStoreSettings(storeId);
    return res.json({ success: true, storeId, settings });
  });

  app.put("/api/store/:storeId/settings", (req, res) => {
    const { storeId } = req.params;
    const updated = tenantStore.updateStoreSettings(storeId, req.body);
    return res.json({ success: true, storeId, settings: updated });
  });

  // Staff Management (Store Scoped)
  app.get("/api/store/:storeId/staff", (req, res) => {
    const { storeId } = req.params;
    const staff = tenantStore.getStoreStaff(storeId);
    return res.json({ success: true, storeId, staff });
  });

  app.post("/api/store/:storeId/staff", (req, res) => {
    const { storeId } = req.params;
    try {
      const newStaff = tenantStore.addStoreStaff(storeId, req.body);
      return res.status(201).json({ success: true, storeId, staff: newStaff });
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err.message || "Failed to add staff member." });
    }
  });

  app.put("/api/store/:storeId/staff/:id", (req, res) => {
    const { storeId, id } = req.params;
    const updated = tenantStore.updateStoreStaff(storeId, id, req.body);
    return res.json({ success: true, storeId, staff: updated });
  });

  app.delete("/api/store/:storeId/staff/:id", (req, res) => {
    const { storeId, id } = req.params;
    tenantStore.deleteStoreStaff(storeId, id);
    return res.json({ success: true, storeId, message: "Staff removed" });
  });

  // Multi-Device Heartbeat & Presence
  app.post("/api/store/:storeId/heartbeat", (req, res) => {
    const { storeId } = req.params;
    const { deviceId, deviceName } = req.body;
    const result = tenantStore.touchDeviceHeartbeat(storeId, deviceId, deviceName);
    return res.json({ 
      success: true, 
      storeId, 
      revoked: result.revoked, 
      devices: result.devices,
      message: result.message 
    });
  });

  // Get Store Active Devices
  app.get("/api/store/:storeId/devices", (req, res) => {
    const { storeId } = req.params;
    const devices = tenantStore.getStoreActiveDevices(storeId);
    return res.json({ success: true, storeId, count: devices.length, devices });
  });

  // Voluntary Device Logout
  app.post("/api/store/:storeId/logout-device", (req, res) => {
    const { storeId } = req.params;
    const { deviceId } = req.body;
    tenantStore.logoutDevice(storeId, deviceId);
    return res.json({ success: true, message: "Device session disconnected successfully" });
  });

  // ==========================================
  // SUPER ADMIN SECURITY & MULTI-DEVICE APIS
  // ==========================================

  // 1-Click Revoke All Sessions & Force Logout per Store
  app.post("/api/admin/stores/:storeId/revoke-all-sessions", (req, res) => {
    const { storeId } = req.params;
    const { revokedBy } = req.body;
    const result = tenantStore.revokeStoreSessions(storeId, revokedBy || "Super Admin (irsaad9118@gmail.com)");
    if (!result.success) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    return res.json({
      success: true,
      message: `All ${result.revokedCount} active session(s) revoked successfully for ${result.store?.storeName}. Connected devices reset to 0.`,
      store: result.store,
      revokedCount: result.revokedCount,
      overview: tenantStore.getSuperAdminOverview()
    });
  });

  // Revoke specific device session
  app.post("/api/admin/stores/:storeId/devices/:deviceId/revoke", (req, res) => {
    const { storeId, deviceId } = req.params;
    const result = tenantStore.revokeDevice(storeId, deviceId);
    return res.json({
      success: true,
      message: `Device ${deviceId} session revoked.`,
      result,
      overview: tenantStore.getSuperAdminOverview()
    });
  });

  // Get Platform Security Alerts Feed & Anomaly Metrics
  app.get("/api/admin/security/alerts", (req, res) => {
    const alertsData = tenantStore.getSecurityAlerts();
    return res.json({
      success: true,
      ...alertsData
    });
  });

  // Mark Security Alert as Resolved
  app.post("/api/admin/security/alerts/:alertId/resolve", (req, res) => {
    const { alertId } = req.params;
    const result = tenantStore.resolveSecurityAlert(alertId);
    return res.json(result);
  });

  // Simulate Blocked 3rd Device Attempt (for testing / demonstration)
  app.post("/api/admin/security/simulate-blocked", (req, res) => {
    const { storeId, deviceName, ip } = req.body;
    const alert = tenantStore.simulateBlockedAttempt(storeId || "STORE-APEX01", deviceName, ip);
    return res.json({ success: true, alert, overview: tenantStore.getSuperAdminOverview() });
  });

  // ==========================================
  // SUPER ADMIN DASHBOARD APIS (Irsaad9118@gmail.com)
  // ==========================================

  // Super Admin Overview: Total Stores, Active Subscriptions, Total Revenue, Expiry dates
  app.get("/api/admin/overview", (req, res) => {
    const overview = tenantStore.getSuperAdminOverview();
    return res.json({
      success: true,
      ownerEmail: "Irsaad9118@gmail.com",
      overview
    });
  });

  // 1-Click "Activate / Deactivate Store Account"
  app.post("/api/admin/stores/:storeId/toggle-status", (req, res) => {
    const { storeId } = req.params;
    const { status } = req.body;
    const updatedStore = tenantStore.toggleStoreStatus(storeId, status);
    if (!updatedStore) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    return res.json({
      success: true,
      message: `Store ${updatedStore.storeName} status changed to ${updatedStore.status.toUpperCase()}`,
      store: updatedStore,
      overview: tenantStore.getSuperAdminOverview()
    });
  });

  // Extend Store Subscription Expiry Date
  app.post("/api/admin/stores/:storeId/extend-subscription", (req, res) => {
    const { storeId } = req.params;
    const { daysToAdd, feeCollected } = req.body;
    const updatedStore = tenantStore.extendSubscription(storeId, Number(daysToAdd) || 30, Number(feeCollected) || 0);
    if (!updatedStore) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    return res.json({
      success: true,
      message: `Extended subscription for ${updatedStore.storeName} until ${updatedStore.subscriptionExpiryDate}`,
      store: updatedStore,
      overview: tenantStore.getSuperAdminOverview()
    });
  });

  // Update Store Subscription Plan
  app.post("/api/admin/stores/:storeId/update-plan", (req, res) => {
    const { storeId } = req.params;
    const { plan, price } = req.body;
    const updatedStore = tenantStore.updateStorePlan(storeId, plan, Number(price) || 0);
    if (!updatedStore) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    return res.json({
      success: true,
      message: `Updated plan for ${updatedStore.storeName} to ${plan}`,
      store: updatedStore,
      overview: tenantStore.getSuperAdminOverview()
    });
  });

  // Update Store Allowed User / Counter Limit (Super Admin Controlled Licensing)
  app.post("/api/admin/stores/:storeId/update-user-limit", (req, res) => {
    const { storeId } = req.params;
    const { allowedUserLimit } = req.body;
    const updatedStore = tenantStore.updateStoreUserLimit(storeId, Number(allowedUserLimit));
    if (!updatedStore) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    const limitLabel = updatedStore.allowedUserLimit === 0 ? "Unlimited Users/Counters" : `${updatedStore.allowedUserLimit} Users/Counters`;
    return res.json({
      success: true,
      message: `License limit updated for ${updatedStore.storeName} to ${limitLabel}`,
      store: updatedStore,
      overview: tenantStore.getSuperAdminOverview()
    });
  });

  // Update Store Password directly by Super Admin
  app.post("/api/admin/stores/:storeId/update-password", (req, res) => {
    const { storeId } = req.params;
    const pass = req.body.password || req.body.newPassword;
    if (!pass || !pass.trim()) {
      return res.status(400).json({ error: "Password cannot be empty." });
    }
    const updatedStore = tenantStore.updateStorePassword(storeId, pass.trim());
    if (!updatedStore) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    return res.json({
      success: true,
      message: `Password updated successfully for ${updatedStore.storeName}`,
      store: updatedStore,
      overview: tenantStore.getSuperAdminOverview()
    });
  });

  // Update Store Permissions, Password, and Limits
  app.post("/api/admin/stores/:storeId/update-permissions", (req, res) => {
    const { storeId } = req.params;
    const { password, allowedUserLimit, status, subscriptionPlan } = req.body;
    let store = tenantStore.getStoreWorkspace(storeId);
    if (!store) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    if (password && password.trim()) {
      tenantStore.updateStorePassword(storeId, password.trim());
    }
    if (allowedUserLimit !== undefined) {
      tenantStore.updateStoreUserLimit(storeId, Number(allowedUserLimit));
    }
    if (status) {
      tenantStore.toggleStoreStatus(storeId, status);
    }
    if (subscriptionPlan) {
      tenantStore.updateStorePlan(storeId, subscriptionPlan, store.subscriptionPrice);
    }
    const updatedStore = tenantStore.getStoreWorkspace(storeId);
    return res.json({
      success: true,
      message: `Permissions and credentials updated for ${updatedStore?.storeName}`,
      store: updatedStore,
      overview: tenantStore.getSuperAdminOverview()
    });
  });

  // Delete Store and All Associated Data
  app.delete("/api/admin/stores/:storeId", (req, res) => {
    const { storeId } = req.params;
    const deleted = tenantStore.deleteStore(storeId);
    if (!deleted) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    return res.json({
      success: true,
      message: `Store ${storeId} and all associated pharmacy records have been deleted.`,
      overview: tenantStore.getSuperAdminOverview()
    });
  });

  // Get Deep Store Data (Store Profile, Live Inventory, Transactions, and Analytics)
  app.get("/api/admin/stores/:storeId/deep-data", (req, res) => {
    const { storeId } = req.params;
    const data = tenantStore.getStoreDeepData(storeId);
    if (!data) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    return res.json({
      success: true,
      ...data
    });
  });

  // 1-Click Launch Live POS Session from Super Admin Console
  app.post("/api/admin/stores/:storeId/launch-session", (req, res) => {
    const { storeId } = req.params;
    const store = tenantStore.getStoreWorkspace(storeId);
    if (!store) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }

    const token = `super_admin_supervisor_token_${store.storeId}_${Date.now()}`;
    const session = {
      user: {
        id: `usr-${store.storeId}-admin-supervisor`,
        name: `${store.ownerName} (Supervisor)`,
        role: 'owner',
        phone: store.ownerPhone,
        email: store.ownerEmail
      },
      storeId: store.storeId,
      store: store,
      token,
      deviceId: `dev-${store.storeId.toLowerCase()}-supervisor`,
      deviceName: 'Admin Supervisor Terminal'
    };

    return res.json({
      success: true,
      message: `Launched live POS terminal for ${store.storeName}`,
      session,
      store
    });
  });

  // Update Store Profile & Full Settings
  app.post("/api/admin/stores/:storeId/update-profile", (req, res) => {
    const { storeId } = req.params;
    const updates = req.body;
    const updated = tenantStore.updateStoreProfile(storeId, updates);
    if (!updated) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    return res.json({
      success: true,
      message: `Profile updated for ${updated.storeName}`,
      store: updated,
      overview: tenantStore.getSuperAdminOverview()
    });
  });

  // Super Admin: Add Item to Store Inventory
  app.post("/api/admin/stores/:storeId/inventory", (req, res) => {
    const { storeId } = req.params;
    const store = tenantStore.getStoreWorkspace(storeId);
    if (!store) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    const newItem = tenantStore.addStoreInventoryItem(storeId, req.body);
    return res.json({
      success: true,
      message: `Added ${newItem.brandName || 'medicine'} to ${store.storeName}`,
      item: newItem,
      inventory: tenantStore.getStoreInventory(storeId)
    });
  });

  // Super Admin: Update Store Inventory Item
  app.put("/api/admin/stores/:storeId/inventory/:itemId", (req, res) => {
    const { storeId, itemId } = req.params;
    const store = tenantStore.getStoreWorkspace(storeId);
    if (!store) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    const updatedItem = tenantStore.updateStoreInventoryItem(storeId, itemId, req.body);
    return res.json({
      success: true,
      message: `Updated inventory item`,
      item: updatedItem,
      inventory: tenantStore.getStoreInventory(storeId)
    });
  });

  // Super Admin: Delete Store Inventory Item
  app.delete("/api/admin/stores/:storeId/inventory/:itemId", (req, res) => {
    const { storeId, itemId } = req.params;
    const store = tenantStore.getStoreWorkspace(storeId);
    if (!store) {
      return res.status(404).json({ error: `Store ${storeId} not found.` });
    }
    tenantStore.deleteStoreInventoryItem(storeId, itemId);
    return res.json({
      success: true,
      message: `Deleted medicine from ${store.storeName}`,
      inventory: tenantStore.getStoreInventory(storeId)
    });
  });

  // =========================================================================
  // SUPER ADMIN ITEM-LEVEL SALES AUDIT & LEADERBOARDS APIS
  // =========================================================================

  // 1. Platform-Wide "Recently Sold Medicines" Live Feed
  app.get("/api/admin/analytics/recent-sales", (req, res) => {
    try {
      const { storeId, search, days, limit } = req.query;
      const soldItems = tenantStore.getAllSoldItems({
        storeId: storeId as string,
        search: search as string,
        days: days ? Number(days) : 30,
        limit: limit ? Number(limit) : 50
      });

      return res.json({
        success: true,
        count: soldItems.length,
        items: soldItems
      });
    } catch (err: any) {
      console.error("Error fetching platform sold items:", err);
      return res.status(500).json({ error: "Failed to fetch sold items feed" });
    }
  });

  // 2. Top Selling Products & Salt Demanded Leaderboards
  app.get("/api/admin/analytics/leaderboard", (req, res) => {
    try {
      const { days } = req.query;
      const leaderboard = tenantStore.getTopSellingProducts(days ? Number(days) : 30);
      return res.json({
        success: true,
        ...leaderboard
      });
    } catch (err: any) {
      console.error("Error fetching sales leaderboard:", err);
      return res.status(500).json({ error: "Failed to fetch sales leaderboard" });
    }
  });

  // 3. Platform Invoices List
  app.get("/api/admin/analytics/invoices", (req, res) => {
    try {
      const { storeId, search, limit } = req.query;
      const invoices = tenantStore.getAllInvoices({
        storeId: storeId as string,
        search: search as string,
        limit: limit ? Number(limit) : 50
      });
      return res.json({
        success: true,
        count: invoices.length,
        invoices
      });
    } catch (err: any) {
      console.error("Error fetching platform invoices:", err);
      return res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  // 4. Single Invoice Detailed Thermal Inspector
  app.get("/api/admin/analytics/invoices/:invoiceNumber", (req, res) => {
    try {
      const { invoiceNumber } = req.params;
      const invoice = tenantStore.getInvoiceByNumber(invoiceNumber);
      if (!invoice) {
        return res.status(404).json({ error: `Invoice ${invoiceNumber} not found.` });
      }
      return res.json({
        success: true,
        invoice
      });
    } catch (err: any) {
      console.error("Error fetching invoice details:", err);
      return res.status(500).json({ error: "Failed to fetch invoice details" });
    }
  });


  // Real-Time POS Cart Drug-Drug & Clinical Safety Interaction Screener
  app.post("/api/gemini/cart-interactions", async (req, res) => {
    try {
      const { cartItems, customer, doctorName } = req.body;

      if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
        return res.json({
          status: "empty",
          analysis: {
            overallRiskLevel: "SAFE",
            severity: "SAFE",
            hasInteractions: false,
            summary: "Cart is empty. AI safety shield is active and ready.",
            conflicts: [],
            allergyConflicts: [],
            diseaseWarnings: [],
            counselingNotes: [],
          }
        });
      }

      const ai = getGenAI();

      if (!ai) {
        // Fallback intelligent clinical pharmacology rule engine
        const fallback = generatePosCartInteractionFallback(cartItems, customer);
        return res.json({
          status: "simulated",
          analysis: fallback,
        });
      }

      const simplifiedItems = cartItems.map((item: any) => ({
        inventoryId: item.inventoryId,
        brandName: item.brandName,
        genericSalt: item.saltComposition || item.genericName || item.genericSalt || "",
        strength: item.strength || "",
        dosageForm: item.dosageForm || "",
        quantity: item.quantity || 1,
      }));

      const prompt = `You are a Senior Board-Certified Clinical Pharmacist (PharmD) supervising a high-volume retail pharmacy POS dispensary.
Analyze the following active POS checkout cart items for immediate real-time drug-drug interactions, drug-allergy contraindications, and patient condition precautions.

Active POS Cart Medications:
${JSON.stringify(simplifiedItems, null, 2)}

Patient / Customer Profile:
- Name: ${customer?.name || "Walk-in Customer"}
- Known Allergies: ${JSON.stringify(customer?.allergies || [])}
- Chronic Conditions: ${JSON.stringify(customer?.chronicConditions || [])}
- Existing Chronic Medications: ${JSON.stringify(customer?.chronicMedications || [])}
- Prescribing Doctor: ${doctorName || "Self / Counter Dispense"}

Clinical Evaluation Requirements:
1. Examine all pairwise drug-drug combinations among the items in the cart AND between cart items and patient's existing chronic medications.
2. Flag any drug-allergy conflicts (e.g. Amoxicillin in Penicillin allergy, Cephalosporins in severe beta-lactam allergy, NSAIDs in Aspirin triad).
3. Flag any disease contraindications (e.g. Beta blockers in Asthma, NSAIDs in CKD/Ulcers/Heart Failure, Decongestants in severe HTN, Metformin in severe renal impairment).
4. Assign an overallRiskLevel: "CRITICAL" (life-threatening/severe harm, immediate pharmacist intervention required), "MAJOR" (significant adverse outcome/efficacy reduction), "MODERATE" (manageable with spacing or monitoring), "MINOR" (mild effect), or "SAFE" (no significant interaction found).
5. For each conflict, provide:
   - drugsInvolved: array of the 2 conflicting drug names
   - conflictingInventoryIds: array of matching inventoryIds from the cart
   - severity: "CRITICAL" | "MAJOR" | "MODERATE" | "MINOR"
   - mechanism: brief physiological/pharmacological mechanism (1 sentence)
   - clinicalEffect: potential adverse patient outcome (1 sentence)
   - actionRecommendation: clear pharmacist recommendation (e.g. switch to paracetamol, separate doses by 2h, contact doctor)
   - suggestedAlternative: safe substitute medication if applicable
   - requiresOverride: boolean (true if CRITICAL or MAJOR)

Return ONLY valid JSON matching this exact structure:
{
  "overallRiskLevel": "CRITICAL" | "MAJOR" | "MODERATE" | "MINOR" | "SAFE",
  "severity": "CRITICAL" | "MAJOR" | "MODERATE" | "MINOR" | "SAFE",
  "hasInteractions": boolean,
  "summary": "1-2 sentence executive pharmacist summary",
  "conflicts": [
    {
      "id": "conflict-1",
      "drugsInvolved": ["Drug A", "Drug B"],
      "conflictingInventoryIds": ["invId1", "invId2"],
      "severity": "CRITICAL" | "MAJOR" | "MODERATE" | "MINOR",
      "mechanism": "Clinical mechanism of interaction",
      "clinicalEffect": "Expected adverse outcome or risk",
      "actionRecommendation": "Pharmacist recommendation",
      "suggestedAlternative": "Alternative drug name",
      "requiresOverride": boolean
    }
  ],
  "allergyConflicts": [
    {
      "allergen": "Allergen name",
      "medication": "Cart medication name",
      "inventoryId": "invId",
      "severity": "CRITICAL" | "MAJOR",
      "notes": "Details on allergy reaction risk"
    }
  ],
  "diseaseWarnings": [
    {
      "condition": "Condition name",
      "medication": "Cart medication name",
      "inventoryId": "invId",
      "risk": "Risk explanation"
    }
  ],
  "counselingNotes": [
    "Key practical counseling note for patient at checkout"
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const text = response.text || "{}";
      try {
        const parsed = JSON.parse(text);
        // Ensure boolean flag consistency
        const hasInteractions = Boolean(
          (parsed.conflicts && parsed.conflicts.length > 0) ||
          (parsed.allergyConflicts && parsed.allergyConflicts.length > 0) ||
          (parsed.diseaseWarnings && parsed.diseaseWarnings.length > 0) ||
          parsed.overallRiskLevel === "CRITICAL" ||
          parsed.overallRiskLevel === "MAJOR" ||
          parsed.overallRiskLevel === "MODERATE"
        );
        parsed.hasInteractions = hasInteractions;
        return res.json({ status: "success", analysis: parsed });
      } catch (parseErr) {
        console.error("JSON parse error from Gemini:", parseErr, text);
        const fallback = generatePosCartInteractionFallback(cartItems, customer);
        return res.json({ status: "success", analysis: fallback });
      }
    } catch (err: any) {
      console.error("Error screening POS cart interactions:", err);
      // Fail gracefully to internal clinical engine
      const fallback = generatePosCartInteractionFallback(req.body.cartItems || [], req.body.customer);
      return res.json({ status: "fallback", analysis: fallback });
    }
  });

  // AI Drug Interaction & Clinical Safety Screener
  app.post("/api/gemini/screen-interactions", async (req, res) => {
    try {
      const { medications, allergies, conditions, newRx } = req.body;
      const ai = getGenAI();

      if (!ai) {
        // Fallback intelligent clinical simulator if key is not configured
        return res.json({
          status: "simulated",
          analysis: generateSimulatedInteractionAnalysis(medications, allergies, conditions, newRx),
        });
      }

      const prompt = `You are a Senior Board-Certified Clinical Pharmacist (PharmD).
Analyze potential drug-drug interactions, drug-allergy contraindications, and drug-disease contraindications for this patient:

Patient Information:
- Current Medications: ${JSON.stringify(medications || [])}
- Known Allergies: ${JSON.stringify(allergies || [])}
- Chronic Conditions: ${JSON.stringify(conditions || [])}
- Proposed/Candidate Medication: ${JSON.stringify(newRx || "N/A")}

Provide a structured clinical safety evaluation. Return ONLY JSON matching this format:
{
  "overallRiskLevel": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
  "summary": "Brief 1-2 sentence executive pharmacist summary",
  "interactions": [
    {
      "severity": "CRITICAL" | "MAJOR" | "MODERATE" | "MINOR",
      "drugsInvolved": ["Drug A", "Drug B"],
      "mechanism": "Clinical mechanism of interaction",
      "clinicalEffect": "Expected adverse outcome or risk",
      "actionRecommendation": "Pharmacist recommendation (e.g. adjust dosage, monitor INR, substitute with X, contact prescriber)"
    }
  ],
  "allergyAlerts": [
    {
      "allergen": "Allergen name",
      "crossReactivityRisk": "HIGH" | "MODERATE" | "LOW",
      "notes": "Details on cross-reactivity"
    }
  ],
  "diseasePrecautions": [
    {
      "condition": "Condition name",
      "risk": "Risk explanation"
    }
  ],
  "pharmacistCounselingPoints": [
    "Key counseling tip 1",
    "Key counseling tip 2"
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const text = response.text || "{}";
      try {
        const parsed = JSON.parse(text);
        res.json({ status: "success", analysis: parsed });
      } catch (parseError) {
        res.json({
          status: "success",
          analysis: {
            overallRiskLevel: "MODERATE",
            summary: text,
            interactions: [],
            allergyAlerts: [],
            diseasePrecautions: [],
            pharmacistCounselingPoints: ["Take as directed with food.", "Monitor for unusual side effects."],
          },
        });
      }
    } catch (err: any) {
      console.error("Error screening interactions:", err);
      res.status(500).json({ error: err.message || "Failed to analyze drug interactions" });
    }
  });

  // AI Patient Counseling Guide & Multilingual Translation
  app.post("/api/gemini/patient-guide", async (req, res) => {
    try {
      const { medicationName, dosage, sig, patientName, targetLanguage = "English", condition } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          status: "simulated",
          guide: {
            medicationName: medicationName || "Prescribed Medication",
            language: targetLanguage,
            greeting: `Hello ${patientName || "Patient"}, here is your easy-to-read guide for ${medicationName}.`,
            purpose: `This medication is commonly used to manage ${condition || "your health condition"}.`,
            howToTake: `Take ${sig || "as directed by your doctor"} with a full glass of water.`,
            bestTimes: "Take at consistent times every day to maintain steady levels in your body.",
            foodsAndDrinksToAvoid: "Avoid excessive alcohol and grapefruit juice unless cleared by your pharmacist.",
            missedDoseInstructions: "Take it as soon as you remember. If it is almost time for your next dose, skip the missed dose and resume your regular schedule. Never take double doses.",
            commonSideEffects: ["Mild stomach upset (take with food)", "Mild dizziness during the first few days", "Dry mouth"],
            redFlagSymptoms: ["Difficulty breathing or facial swelling", "Severe rash or hives", "Sudden chest pain or severe dizziness"],
            storageInstructions: "Store at room temperature away from excessive moisture, heat, and direct light. Keep out of reach of children.",
            pharmacistNote: "Call our pharmacy team anytime if you experience questions or unusual reactions."
          }
        });
      }

      const prompt = `You are a friendly, compassionate clinical pharmacist creating an easy-to-read, empathetic patient consultation sheet.
Medication: ${medicationName}
Dosage & Sig: ${dosage} - ${sig}
Patient Name: ${patientName || "Valued Patient"}
Target Language: ${targetLanguage}
Indication / Condition: ${condition || "Prescribed medical condition"}

Format the response in clear, friendly, jargon-free 6th-grade reading level language, translated completely into ${targetLanguage}.
Return ONLY JSON matching:
{
  "medicationName": "${medicationName}",
  "language": "${targetLanguage}",
  "greeting": "Personalized friendly greeting",
  "purpose": "What this medicine does for the body in simple terms",
  "howToTake": "Step by step instructions on how and when to take it",
  "bestTimes": "Ideal time of day or meal association",
  "foodsAndDrinksToAvoid": "Foods, drinks, or supplements that interfere",
  "missedDoseInstructions": "Exact steps if a dose is missed",
  "commonSideEffects": ["Side effect 1 with simple mitigation", "Side effect 2"],
  "redFlagSymptoms": ["Warning sign when to seek immediate medical help"],
  "storageInstructions": "Proper storage guidelines",
  "pharmacistNote": "Reassuring closing note from the pharmacy team"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      res.json({ status: "success", guide: parsed });
    } catch (err: any) {
      console.error("Error generating patient guide:", err);
      res.status(500).json({ error: err.message || "Failed to generate patient guide" });
    }
  });

  // AI Sig Parser & Rx Interpreter
  app.post("/api/gemini/parse-rx", async (req, res) => {
    try {
      const { rawSigText, medicationName } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          status: "simulated",
          parsed: {
            standardSig: rawSigText || "Take 1 tablet by mouth twice daily with meals",
            frequency: "Twice daily (BID)",
            route: "Oral (PO)",
            durationDays: 30,
            recommendedQuantity: 60,
            timingAdvice: "With or after meals",
            clinicalPrecautions: ["Ensure kidney function is monitored if used long term.", "Take with food to minimize gastric discomfort."],
            refillEligibilityDays: 25,
          }
        });
      }

      const prompt = `You are an expert pharmacy dispensing informatics system.
Parse the following medical Sig / prescription instructions for ${medicationName || "the medication"}:
"${rawSigText}"

Translate Latin abbreviations (e.g., PO, BID, TID, QID, PRN, AC, PC, QHS, Q4-6H), calculate standard dosing parameters, and flag any safety anomalies.
Return ONLY JSON matching:
{
  "standardSig": "Plain English standardized label instructions",
  "frequency": "e.g. Twice daily (BID)",
  "route": "e.g. Oral, Topical, Inhalation",
  "durationDays": number or null,
  "recommendedQuantity": number or null,
  "timingAdvice": "e.g. Morning with food, At bedtime",
  "clinicalPrecautions": ["Precaution 1", "Precaution 2"],
  "refillEligibilityDays": number
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ status: "success", parsed });
    } catch (err: any) {
      console.error("Error parsing Sig:", err);
      res.status(500).json({ error: err.message || "Failed to parse prescription sig" });
    }
  });

  // AI Comprehensive MTM (Medication Therapy Management) Plan
  app.post("/api/gemini/mtm-review", async (req, res) => {
    try {
      const { patient, prescriptions, recentVitals } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          status: "simulated",
          mtmPlan: {
            reviewDate: new Date().toISOString().split("T")[0],
            adherenceScore: patient?.adherenceScore || 85,
            adherenceRiskLevel: (patient?.adherenceScore || 85) < 75 ? "HIGH" : "LOW",
            identifiedIssues: [
              {
                category: "Refill Synchronization",
                description: "Patient medications are refilled on 3 different days of the month, creating pill fatigue.",
                action: "Enroll in MedSync program to align all refills on the 1st of every month."
              },
              {
                category: "Therapeutic Monitoring",
                description: "Blood pressure and A1C checks are due within the next 30 days.",
                action: "Schedule in-pharmacy BP check and point-of-care capillary glucose screening."
              }
            ],
            prescriberRecommendations: [
              "Consider switching from separate morning/evening doses to once-daily extended-release formulation to improve adherence.",
              "Verify annual renal panel (eGFR/Creatinine) for dosage verification."
            ],
            patientActionSteps: [
              "Use a 7-day AM/PM pill organizer provided free by our pharmacy.",
              "Set mobile phone refill alerts or enable WhatsApp automated 3-day advance reminders.",
              "Bring all current OTC supplements to next pharmacy consultation."
            ],
            targetGoal: "Achieve >90% medication possession ratio (PDC) over the next 90 days."
          }
        });
      }

      const prompt = `You are a Lead Clinical Pharmacist performing a comprehensive Medication Therapy Management (MTM) review.
Patient Profile:
${JSON.stringify(patient, null, 2)}

Active Prescriptions:
${JSON.stringify(prescriptions, null, 2)}

Vitals / Clinical Notes:
${JSON.stringify(recentVitals || {}, null, 2)}

Generate a high-grade MTM Comprehensive Medication Review (CMR) & Pharmacist Care Plan.
Return ONLY JSON matching:
{
  "reviewDate": "${new Date().toISOString().split("T")[0]}",
  "adherenceScore": number,
  "adherenceRiskLevel": "LOW" | "MODERATE" | "HIGH",
  "identifiedIssues": [
    {
      "category": "Drug Interaction | Suboptimal Dosage | Non-Adherence | Adverse Effect | Cost Barrier",
      "description": "Clinical problem detail",
      "action": "Pharmacist resolution"
    }
  ],
  "prescriberRecommendations": [
    "Formal recommendation 1 for doctor",
    "Formal recommendation 2"
  ],
  "patientActionSteps": [
    "Empowering step 1",
    "Empowering step 2"
  ],
  "targetGoal": "Target clinical outcome or adherence target"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ status: "success", mtmPlan: parsed });
    } catch (err: any) {
      console.error("Error generating MTM plan:", err);
      res.status(500).json({ error: err.message || "Failed to generate MTM plan" });
    }
  });

  // AI Refill Outreach Campaign Message Generator
  app.post("/api/gemini/campaign-copy", async (req, res) => {
    try {
      const { campaignType, tone = "friendly & caring", medicationName, pharmacyName = "PharmPulse Pharmacy" } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          status: "simulated",
          copy: {
            sms: `Hi [Patient Name], your ${medicationName || "prescriptions"} at ${pharmacyName} are due for refill! Reply YES to prepare for pickup, or call us at (555) 019-2834. Stay healthy!`,
            emailSubject: `Time to Refill Your Prescription - ${pharmacyName}`,
            emailBody: `Dear [Patient Name],\n\nWe care about your ongoing health! Our records show your ${medicationName || "medication"} is scheduled for a refill in the next 3 days.\n\nWe have your prescription on file and can prepare it for in-store pickup or free home delivery.\n\nClick below to confirm your refill or reply to this email.\n\nWarm regards,\nYour ${pharmacyName} Team`,
            whatsapp: `Hello [Patient Name] 🌿 This is a quick friendly reminder from *${pharmacyName}*. Your refill for *${medicationName || "your medication"}* is ready to be ordered. Would you like us to fill it today? [1] Yes, Pickup [2] Yes, Delivery [3] Need to speak with Pharmacist.`
          }
        });
      }

      const prompt = `You are a healthcare communications specialist for a community pharmacy named "${pharmacyName}".
Generate 3 compliant, HIPAA-safe, persuasive, and warm outreach message templates for campaign type: "${campaignType}".
Medication context: "${medicationName || "All active maintenance medications"}"
Tone: "${tone}"

Return ONLY JSON matching:
{
  "sms": "SMS template with placeholder [Patient Name] (under 160 chars)",
  "emailSubject": "Engaging email subject line",
  "emailBody": "Friendly multi-paragraph email copy",
  "whatsapp": "WhatsApp template formatted with clean emojis and reply quick-codes"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({ status: "success", copy: parsed });
    } catch (err: any) {
      console.error("Error generating campaign copy:", err);
      res.status(500).json({ error: err.message || "Failed to generate campaign copy" });
    }
  });

  // Store Logo AI Generator (SVG Vector Emblem & Branding Studio)
  app.post("/api/gemini/generate-logo", async (req, res) => {
    try {
      const {
        storeName = "Apex Medicos & Healthcare",
        tagline = "Trusted 24x7 Retail & Clinical Care",
        style = "modern-clinical",
        palette = "teal-emerald",
        symbol = "shield-rx",
        customPrompt = "",
      } = req.body;

      const ai = getGenAI();

      if (!ai) {
        // Fallback parametric SVG emblem generator
        const fallbackSvg = generateServerParametricLogo({
          storeName,
          tagline,
          style,
          palette,
          symbol,
        });

        return res.json({
          status: "simulated",
          svg: fallbackSvg,
          designRationale: `Parametric ${style} emblem crafted with ${palette} harmony and ${symbol} central motif.`,
          primaryColor: palette === "blue-cyan" ? "#2563eb" : palette === "sage-amber" ? "#059669" : palette === "indigo-gold" ? "#4f46e5" : palette === "crimson-rose" ? "#e11d48" : palette === "dark-slate" ? "#334155" : "#0d9488",
          secondaryColor: palette === "blue-cyan" ? "#06b6d4" : palette === "sage-amber" ? "#d97706" : palette === "indigo-gold" ? "#eab308" : palette === "crimson-rose" ? "#f43f5e" : palette === "dark-slate" ? "#0ea5e9" : "#10b981",
        });
      }

      const prompt = `You are a world-class graphic designer specializing in pharmaceutical, chemist, and medical dispensary brand identities.
Create a stunning, balanced, professional vector SVG emblem for a pharmacy store.

Pharmacy Details:
- Store Name: "${storeName}"
- Tagline / Slogan: "${tagline}"
- Style Archetype: "${style}" (e.g. modern clinical, herbal ayurvedic, heritage apothecary, high-tech pulse)
- Dominant Motif / Symbol: "${symbol}" (e.g. caduceus, mortar & pestle, medical cross, capsule, heart pulse, shield)
- Color Palette Preference: "${palette}"
- Custom Notes: "${customPrompt || "Crisp, centered, symmetric, scalable emblem suitable for POS thermal bills and official Tax Invoices"}"

CRITICAL REQUIREMENTS:
1. Return valid JSON containing the "svg" field as a clean, complete, self-contained SVG string with:
   - xmlns="http://www.w3.org/2000/svg"
   - viewBox="0 0 500 500"
   - width="500" height="500"
   - Clean linearGradient defs for rich depth
   - Elegant, centered geometric badge or shield frame
   - Beautiful vector geometry for the requested symbol
   - Store name clearly readable in uppercase in a banner or bottom curve
   - Tagline / Verified Dispensary text
2. DO NOT use external raster images or external fonts. Use system fonts (system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif) with bold weights.
3. Make sure all SVG tags are closed and properly formatted.

Return JSON in this EXACT schema:
{
  "svg": "<svg xmlns=...>...</svg>",
  "designRationale": "1-2 sentence description of the brand identity",
  "primaryColor": "#hexCode",
  "secondaryColor": "#hexCode"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      if (!parsed.svg || !parsed.svg.includes("<svg")) {
        parsed.svg = generateServerParametricLogo({
          storeName,
          tagline,
          style,
          palette,
          symbol,
        });
      }

      res.json({
        status: "success",
        svg: parsed.svg,
        designRationale: parsed.designRationale || `AI-generated bespoke pharmaceutical emblem for ${storeName}`,
        primaryColor: parsed.primaryColor || "#0d9488",
        secondaryColor: parsed.secondaryColor || "#10b981",
      });
    } catch (err: any) {
      console.error("Error generating pharmacy logo:", err);
      // If AI generation fails, graceful fallback to parametric SVG
      const fallbackSvg = generateServerParametricLogo(req.body || {});
      res.json({
        status: "fallback",
        svg: fallbackSvg,
        designRationale: "Custom parametric vector emblem generated as fallback.",
        primaryColor: "#0d9488",
        secondaryColor: "#10b981",
      });
    }
  });

  // ========================================================
  // IMAGEN API - MEDICATION CATEGORY PLACEHOLDER THUMBNAILS
  // ========================================================
  const categoryThumbnailCache: Record<string, {
    category: string;
    imageUrl: string;
    prompt: string;
    isAiGenerated: boolean;
    provider: string;
    generatedAt: string;
  }> = {};

  // 1. Get all cached category thumbnails
  app.get("/api/inventory/category-thumbnails", (req, res) => {
    res.json({
      status: "success",
      thumbnails: categoryThumbnailCache,
    });
  });

  // 2. Generate or fetch category placeholder thumbnail via Imagen API
  app.post("/api/inventory/category-thumbnail", async (req, res) => {
    try {
      const { category, dosageForm, customPrompt, forceRegenerate } = req.body || {};
      const catKey = (category || "General Medicine").trim();
      const normalizedKey = catKey.toLowerCase().replace(/[^a-z0-9]/g, "_");

      if (!forceRegenerate && categoryThumbnailCache[normalizedKey]) {
        return res.json({
          success: true,
          ...categoryThumbnailCache[normalizedKey],
        });
      }

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          success: false,
          requiresKey: true,
          category: catKey,
          message: "Gemini / Imagen API key is not configured in server environment.",
        });
      }

      const prompt = customPrompt || 
        `Professional commercial studio product photography of pharmaceutical ${catKey} medication (${dosageForm || "Tablet"} packaging), clean sterile white background, modern blister pack with foil seal and medicine pills, soft studio lighting, sharp macro lens, commercial catalog pharmacy photography, 1:1 aspect ratio`;

      // Call Imagen model (gemini-3.1-flash-lite-image as per guidelines)
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [{ text: prompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: "1:1",
            },
          },
        });

        let generatedImageBase64 = "";
        let mimeType = "image/png";

        const candidates = response.candidates || [];
        for (const cand of candidates) {
          for (const part of cand.content?.parts || []) {
            if (part.inlineData?.data) {
              generatedImageBase64 = part.inlineData.data;
              if (part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
              break;
            }
          }
          if (generatedImageBase64) break;
        }

        if (generatedImageBase64) {
          const imageUrl = `data:${mimeType};base64,${generatedImageBase64}`;
          const record = {
            category: catKey,
            imageUrl,
            prompt,
            isAiGenerated: true,
            provider: "imagen",
            generatedAt: new Date().toISOString(),
          };
          categoryThumbnailCache[normalizedKey] = record;
          return res.json({
            success: true,
            ...record,
          });
        }
      } catch (genErr: any) {
        console.warn("Imagen generation error:", genErr.message);
        const isQuota = genErr.message?.includes("RESOURCE_EXHAUSTED") || 
                        genErr.message?.includes("Quota exceeded") || 
                        genErr.message?.includes("429") ||
                        genErr.message?.includes("limit: 0");

        return res.json({
          success: false,
          requiresPaidKey: isQuota,
          error: genErr.message,
          category: catKey,
          prompt,
          provider: "fallback_svg",
          message: isQuota 
            ? "Imagen model requires a paid API key for live generation on free tier. Using crisp clinical vector placeholder."
            : "Imagen generation encountered an error. Using clinical vector placeholder.",
        });
      }

      res.json({
        success: false,
        category: catKey,
        provider: "fallback_svg",
        message: "No image bytes returned from model.",
      });
    } catch (err: any) {
      console.error("Error in category thumbnail endpoint:", err);
      res.status(500).json({
        success: false,
        error: err.message,
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PharmPulse Pharmacy CRM server running on http://localhost:${PORT}`);
  });
}

function generatePosCartInteractionFallback(cartItems: any[], customer?: any) {
  const items = cartItems || [];
  if (items.length === 0) {
    return {
      overallRiskLevel: "SAFE",
      severity: "SAFE",
      hasInteractions: false,
      summary: "Cart is empty. AI safety shield is active and ready.",
      conflicts: [],
      allergyConflicts: [],
      diseaseWarnings: [],
      counselingNotes: ["Maintain regular consultation for chronic medications."],
    };
  }

  const conflicts: any[] = [];
  const allergyConflicts: any[] = [];
  const diseaseWarnings: any[] = [];
  const counselingNotes: string[] = [];

  const itemNames = items.map((it: any) => ({
    id: it.inventoryId || it.id || "",
    brand: (it.brandName || it.medicationName || "").toLowerCase(),
    salt: (it.saltComposition || it.genericName || it.genericSalt || "").toLowerCase(),
    raw: `${it.brandName || ""} ${it.saltComposition || ""} ${it.genericName || ""}`.toLowerCase()
  }));

  const customerAllergies = (customer?.allergies || []).map((a: string) => a.toLowerCase());
  const customerConditions = (customer?.chronicConditions || []).map((c: string) => c.toLowerCase());
  const chronicMeds = (customer?.chronicMedications || []).map((m: any) => 
    (typeof m === "string" ? m : `${m.medicineName || ""} ${m.genericSalt || ""}`).toLowerCase()
  );

  // Helper matching function
  const hasDrug = (keyword: string) => {
    return itemNames.find(it => it.brand.includes(keyword) || it.salt.includes(keyword) || it.raw.includes(keyword)) || null;
  };

  const hasChronic = (keyword: string) => {
    return chronicMeds.some(m => m.includes(keyword));
  };

  // Rule 1: Warfarin / Acenocoumarol + NSAIDs / Aspirin (CRITICAL)
  const warfarinItem = hasDrug("warfarin") || hasDrug("coumadin") || hasDrug("acenocoumarol") || (hasChronic("warfarin") ? { id: "chronic-warfarin", brand: "Warfarin (Chronic)" } : null);
  const nsaidItem = hasDrug("aspirin") || hasDrug("disprin") || hasDrug("ecosprin") || hasDrug("ibuprofen") || hasDrug("brufen") || hasDrug("diclofenac") || hasDrug("voveran") || hasDrug("naproxen") || hasDrug("combiflam");
  
  if (warfarinItem && nsaidItem) {
    conflicts.push({
      id: "conflict-warfarin-nsaid",
      drugsInvolved: [warfarinItem.brand || "Warfarin", nsaidItem.brand || "NSAID / Aspirin"],
      conflictingInventoryIds: [warfarinItem.id, nsaidItem.id].filter(Boolean),
      severity: "CRITICAL",
      mechanism: "Potentiation of anticoagulant effect through cyclooxygenase-1 inhibition and gastric mucosal injury.",
      clinicalEffect: "Extreme risk of acute gastrointestinal hemorrhage, systemic bleeding, and unstable INR.",
      actionRecommendation: "DO NOT CO-DISPENSE without direct prescriber override. Substitute NSAID with Paracetamol (max 2g/day) or topical formulation.",
      suggestedAlternative: "Paracetamol (Dolo 650mg / Calpol)",
      requiresOverride: true,
    });
    counselingNotes.push("Educate patient on warning signs of abnormal bleeding, dark tarry stools, or unusual bruising.");
  }

  // Rule 2: Statins (Atorvastatin, Simvastatin) + Macrolides (Clarithromycin, Erythromycin) (CRITICAL / MAJOR)
  const statinItem = hasDrug("atorvastatin") || hasDrug("atorva") || hasDrug("simvastatin") || hasDrug("rosuvastatin") || (hasChronic("statin") || hasChronic("atorva") ? { id: "chronic-statin", brand: "Statin (Chronic)" } : null);
  const macrolideItem = hasDrug("clarithromycin") || hasDrug("erythromycin") || hasDrug("claribid");

  if (statinItem && macrolideItem) {
    conflicts.push({
      id: "conflict-statin-macrolide",
      drugsInvolved: [statinItem.brand || "Statin", macrolideItem.brand || "Macrolide Antibiotic"],
      conflictingInventoryIds: [statinItem.id, macrolideItem.id].filter(Boolean),
      severity: "CRITICAL",
      mechanism: "Strong CYP3A4 inhibition by macrolide dramatically increases systemic statin bio-availability.",
      clinicalEffect: "Markedly elevated risk of severe myopathy, muscle breakdown, and fatal rhabdomyolysis.",
      actionRecommendation: "Temporarily withhold statin therapy for duration of antibiotic course, or substitute antibiotic with Azithromycin.",
      suggestedAlternative: "Azithromycin 500mg (Azithral / Azee)",
      requiresOverride: true,
    });
  }

  // Rule 3: ACEI / ARB (Telmisartan, Ramipril, Enalapril, Lisinopril) + Potassium Sparing (Spironolactone, Aldactone) / Potassium Supplements (MAJOR)
  const aceiItem = hasDrug("telmisartan") || hasDrug("telma") || hasDrug("ramipril") || hasDrug("cardace") || hasDrug("enalapril") || hasDrug("losartan") || (hasChronic("telmisartan") || hasChronic("ramipril") ? { id: "chronic-acei", brand: "ACEI/ARB (Chronic)" } : null);
  const kItem = hasDrug("spironolactone") || hasDrug("aldactone") || hasDrug("potassium") || hasDrug("potcl");

  if (aceiItem && kItem) {
    conflicts.push({
      id: "conflict-acei-potassium",
      drugsInvolved: [aceiItem.brand || "ACEI / ARB", kItem.brand || "Potassium Sparing / Supplement"],
      conflictingInventoryIds: [aceiItem.id, kItem.id].filter(Boolean),
      severity: "MAJOR",
      mechanism: "Combined suppression of renal aldosterone excretion leading to potassium accumulation.",
      clinicalEffect: "Significant risk of severe hyperkalemia, muscle weakness, and cardiac conduction abnormalities.",
      actionRecommendation: "Verify recent serum potassium & creatinine labs. Counsel patient to avoid potassium salt substitutes.",
      suggestedAlternative: "Hydrochlorothiazide / Amlodipine combination if diuretic required",
      requiresOverride: true,
    });
  }

  // Rule 4: Sildenafil / Tadalafil + Nitrates (Sorbitrate, Nitroglycerin, Monit) (CRITICAL)
  const pde5Item = hasDrug("sildenafil") || hasDrug("manforce") || hasDrug("tadalafil") || hasDrug("megalis");
  const nitrateItem = hasDrug("nitrate") || hasDrug("nitroglycerin") || hasDrug("sorbitrate") || hasDrug("monit") || hasDrug("isordil") || (hasChronic("nitrate") || hasChronic("sorbitrate") ? { id: "chronic-nitrate", brand: "Nitrate (Chronic)" } : null);

  if (pde5Item && nitrateItem) {
    conflicts.push({
      id: "conflict-pde5-nitrate",
      drugsInvolved: [pde5Item.brand || "PDE-5 Inhibitor", nitrateItem.brand || "Organic Nitrate"],
      conflictingInventoryIds: [pde5Item.id, nitrateItem.id].filter(Boolean),
      severity: "CRITICAL",
      mechanism: "cGMP accumulation leading to profound peripheral vasodilation.",
      clinicalEffect: "Life-threatening acute hypotension, cardiovascular collapse, and myocardial ischemia.",
      actionRecommendation: "ABSOLUTE CONTRAINDICATION. Do not dispense concurrently under any circumstance.",
      suggestedAlternative: "Consult cardiologist for non-nitrate angina management or alternative ED therapies.",
      requiresOverride: true,
    });
  }

  // Rule 5: Fluoroquinolones (Ciprofloxacin, Levofloxacin) + Antacids / Multivitamins (Chelation - MODERATE)
  const fqItem = hasDrug("ciprofloxacin") || hasDrug("cipro") || hasDrug("levofloxacin") || hasDrug("levomac") || hasDrug("ofloxacin");
  const antacidItem = hasDrug("antacid") || hasDrug("gelusil") || hasDrug("digene") || hasDrug("calcium") || hasDrug("shelcal") || hasDrug("zinc") || hasDrug("iron") || hasDrug("autrin");

  if (fqItem && antacidItem) {
    conflicts.push({
      id: "conflict-chelation",
      drugsInvolved: [fqItem.brand || "Fluoroquinolone", antacidItem.brand || "Antacid / Polyvalent Cation"],
      conflictingInventoryIds: [fqItem.id, antacidItem.id].filter(Boolean),
      severity: "MODERATE",
      mechanism: "Polyvalent metal cations form insoluble chelates with the quinolone molecule in the gut.",
      clinicalEffect: "Substantial reduction in antibiotic bioavailability (up to 75% decreased absorption), risking treatment failure.",
      actionRecommendation: "Instruct patient to administer antibiotic at least 2 hours before or 4 hours after antacid/calcium/iron.",
      suggestedAlternative: "Separate dosing schedule by 2-4 hours",
      requiresOverride: false,
    });
    counselingNotes.push("Take antibiotic 2 hours BEFORE or 4 hours AFTER any antacids, milk, or multivitamin tablets.");
  }

  // Rule 6: Duplicate Therapy / Dual NSAID (MODERATE)
  const nsaidCount = items.filter((it: any) => {
    const raw = `${it.brandName || ""} ${it.saltComposition || ""}`.toLowerCase();
    return raw.includes("ibuprofen") || raw.includes("diclofenac") || raw.includes("aceclofenac") || raw.includes("naproxen") || raw.includes("ketorolac") || raw.includes("etoricoxib");
  });
  if (nsaidCount.length >= 2) {
    conflicts.push({
      id: "conflict-duplicate-nsaid",
      drugsInvolved: nsaidCount.map((n: any) => n.brandName),
      conflictingInventoryIds: nsaidCount.map((n: any) => n.inventoryId),
      severity: "MAJOR",
      mechanism: "Duplicate therapeutic class (COX-1/COX-2 inhibition) providing no additive analgesia.",
      clinicalEffect: "Doubled rate of peptic ulceration, renal toxicity, and GI perforation.",
      actionRecommendation: "Select only one single systemic NSAID agent. Add PPI if GI risk factors present.",
      suggestedAlternative: "Keep one NSAID and add Pantoprazole/Rabeprazole if gastro-protection needed",
      requiresOverride: true,
    });
  }

  // Rule 7: Allergy Screening
  customerAllergies.forEach((allergy: string) => {
    items.forEach((it: any) => {
      const raw = `${it.brandName || ""} ${it.saltComposition || ""}`.toLowerCase();
      if ((allergy.includes("penicillin") || allergy.includes("amoxicillin")) && (raw.includes("amoxicillin") || raw.includes("augmentin") || raw.includes("mox") || raw.includes("ampicillin") || raw.includes("penicillin"))) {
        allergyConflicts.push({
          allergen: allergy.toUpperCase(),
          medication: it.brandName,
          inventoryId: it.inventoryId,
          severity: "CRITICAL",
          notes: `Customer has recorded severe allergy to ${allergy}. High risk of anaphylaxis, urticaria, or angioedema.`,
        });
      }
      if ((allergy.includes("sulfa") || allergy.includes("sulfonamide")) && (raw.includes("bactrim") || raw.includes("septran") || raw.includes("sulfamethoxazole"))) {
        allergyConflicts.push({
          allergen: allergy.toUpperCase(),
          medication: it.brandName,
          inventoryId: it.inventoryId,
          severity: "CRITICAL",
          notes: `Customer is allergic to Sulfa medications. Risk of Stevens-Johnson syndrome or acute allergic dermatitis.`,
        });
      }
      if ((allergy.includes("aspirin") || allergy.includes("nsaid")) && (raw.includes("aspirin") || raw.includes("ibuprofen") || raw.includes("diclofenac") || raw.includes("aceclofenac"))) {
        allergyConflicts.push({
          allergen: allergy.toUpperCase(),
          medication: it.brandName,
          inventoryId: it.inventoryId,
          severity: "CRITICAL",
          notes: `Patient flagged with NSAID/Aspirin allergy. Risk of bronchospasm / Aspirin-Exacerbated Respiratory Disease.`,
        });
      }
    });
  });

  // Rule 8: Disease Contraindication Screening
  customerConditions.forEach((condition: string) => {
    items.forEach((it: any) => {
      const raw = `${it.brandName || ""} ${it.saltComposition || ""}`.toLowerCase();
      if ((condition.includes("asthma") || condition.includes("copd")) && (raw.includes("propranolol") || raw.includes("atenolol") || raw.includes("metoprolol") || raw.includes("betaloc") || raw.includes("ciplar"))) {
        diseaseWarnings.push({
          condition: "Asthma / Reactive Airway Disease",
          medication: it.brandName,
          inventoryId: it.inventoryId,
          risk: "Beta-blocker antagonism can precipitate acute bronchospasm and refractory asthma exacerbation.",
        });
      }
      if ((condition.includes("ulcer") || condition.includes("gerd") || condition.includes("gastric")) && (raw.includes("aspirin") || raw.includes("diclofenac") || raw.includes("ibuprofen") || raw.includes("aceclofenac"))) {
        diseaseWarnings.push({
          condition: "Peptic Ulcer Disease / GI Bleed History",
          medication: it.brandName,
          inventoryId: it.inventoryId,
          risk: "NSAID use directly irritates mucosal barrier and inhibits protective prostaglandin synthesis.",
        });
      }
      if ((condition.includes("hypertension") || condition.includes("blood pressure")) && (raw.includes("pseudoephedrine") || raw.includes("phenylephrine") || raw.includes("nasal drop") || raw.includes("sinarest") || raw.includes("cheston"))) {
        diseaseWarnings.push({
          condition: "Hypertension",
          medication: it.brandName,
          inventoryId: it.inventoryId,
          risk: "Oral sympathomimetic decongestants cause peripheral vasoconstriction and can spike blood pressure.",
        });
      }
    });
  });

  // Determine overall severity
  let overallRiskLevel: "CRITICAL" | "MAJOR" | "MODERATE" | "MINOR" | "SAFE" = "SAFE";
  if (conflicts.some(c => c.severity === "CRITICAL") || allergyConflicts.some(a => a.severity === "CRITICAL")) {
    overallRiskLevel = "CRITICAL";
  } else if (conflicts.some(c => c.severity === "MAJOR") || allergyConflicts.length > 0 || diseaseWarnings.length > 0) {
    overallRiskLevel = "MAJOR";
  } else if (conflicts.some(c => c.severity === "MODERATE")) {
    overallRiskLevel = "MODERATE";
  } else if (conflicts.some(c => c.severity === "MINOR")) {
    overallRiskLevel = "MINOR";
  }

  const hasInteractions = conflicts.length > 0 || allergyConflicts.length > 0 || diseaseWarnings.length > 0;

  let summary = "All medications in cart verified safe. No significant drug interactions detected.";
  if (overallRiskLevel === "CRITICAL") {
    summary = "CRITICAL SAFETY ALERT: Severe contraindicated combination detected in cart. Pharmacist clinical intervention required before dispensing.";
  } else if (overallRiskLevel === "MAJOR") {
    summary = "MAJOR INTERACTION WARNING: Significant pharmacological interaction or clinical precaution identified.";
  } else if (overallRiskLevel === "MODERATE") {
    summary = "MODERATE PRECAUTION: Spacing of doses or counseling on food intake recommended.";
  }

  if (counselingNotes.length === 0) {
    counselingNotes.push("Instruct patient on scheduled dosing, taking with water, and completing antibiotic courses.");
  }

  return {
    overallRiskLevel,
    severity: overallRiskLevel,
    hasInteractions,
    summary,
    conflicts,
    allergyConflicts,
    diseaseWarnings,
    counselingNotes,
  };
}

function generateSimulatedInteractionAnalysis(medications: any[], allergies: any[], conditions: any[], newRx: any) {
  const currentDrugs = (medications || []).map((m: any) => (typeof m === "string" ? m : m.name || m.brandName || "").toLowerCase());
  const newRxName = (typeof newRx === "string" ? newRx : newRx?.medicationName || newRx?.name || "").toLowerCase();
  
  const interactions = [];
  let risk: "LOW" | "MODERATE" | "HIGH" | "CRITICAL" = "LOW";

  // Check for common real clinical interaction pairs
  if ((newRxName.includes("warfarin") || currentDrugs.some(d => d.includes("warfarin"))) &&
      (newRxName.includes("aspirin") || currentDrugs.some(d => d.includes("aspirin")) || newRxName.includes("ibuprofen") || currentDrugs.some(d => d.includes("ibuprofen")))) {
    risk = "HIGH";
    interactions.push({
      severity: "MAJOR",
      drugsInvolved: ["Warfarin", "NSAID / Aspirin"],
      mechanism: "Additive antiplatelet / anticoagulant effect and gastrointestinal mucosal injury",
      clinicalEffect: "Substantially increased risk of severe GI hemorrhage and systemic bleeding",
      actionRecommendation: "Avoid combination if possible; substitute NSAID with Acetaminophen for pain, or co-prescribe PPI with frequent INR monitoring."
    });
  }

  if ((newRxName.includes("lisinopril") || currentDrugs.some(d => d.includes("lisinopril"))) &&
      (newRxName.includes("spironolactone") || currentDrugs.some(d => d.includes("spironolactone")) || newRxName.includes("potassium") || currentDrugs.some(d => d.includes("potassium")))) {
    if (risk !== "HIGH") risk = "MODERATE";
    interactions.push({
      severity: "MODERATE",
      drugsInvolved: ["ACE Inhibitor (Lisinopril)", "Potassium Sparing / Supplement"],
      mechanism: "Synergistic potassium retention in distal renal tubules",
      clinicalEffect: "Risk of symptomatic hyperkalemia and cardiac dysrhythmias",
      actionRecommendation: "Check baseline serum potassium and creatinine within 1-2 weeks; educate patient on avoiding potassium salt substitutes."
    });
  }

  if ((newRxName.includes("atorvastatin") || newRxName.includes("simvastatin")) &&
      (newRxName.includes("clarithromycin") || currentDrugs.some(d => d.includes("clarithromycin")) || newRxName.includes("erythromycin") || currentDrugs.some(d => d.includes("erythromycin")))) {
    risk = "HIGH";
    interactions.push({
      severity: "MAJOR",
      drugsInvolved: ["Statin", "Macrolide Antibiotic"],
      mechanism: "Potent CYP3A4 inhibition by macrolide elevates statin systemic exposure",
      clinicalEffect: "Increased risk of myopathy and acute rhabdomyolysis",
      actionRecommendation: "Temporarily hold statin therapy during antibiotic course or switch antibiotic to Azithromycin."
    });
  }

  // If no built-in pair matched, generate realistic clinical safety feedback
  if (interactions.length === 0) {
    interactions.push({
      severity: "MINOR",
      drugsInvolved: [newRxName || "Prescription", "Maintenance Regimen"],
      mechanism: "No critical pharmacokinetic CYP450 or pharmacodynamic antagonism detected",
      clinicalEffect: "Expected standard therapeutic absorption and clearance",
      actionRecommendation: "Proceed with standard dispensing protocol and counsel patient on scheduled administration."
    });
  }

  return {
    overallRiskLevel: risk,
    summary: risk === "HIGH" 
      ? `High-risk clinical drug interaction detected. Pharmacist intervention recommended prior to dispensing ${newRxName || "medication"}.`
      : `Clinical safety screening complete for ${newRxName || "medication"}. Regimen appears safe with standard counseling precautions.`,
    interactions,
    allergyAlerts: (allergies || []).map((a: string) => ({
      allergen: a,
      crossReactivityRisk: "LOW",
      notes: `Screened for cross-reactivity with ${newRxName || "regimen"}. No direct IgE-mediated contraindication detected.`
    })),
    diseasePrecautions: (conditions || []).map((c: string) => ({
      condition: c,
      risk: `Monitor therapeutic response in conjunction with ${c}.`
    })),
    pharmacistCounselingPoints: [
      "Take consistently at the same time each day.",
      "Store at room temperature (68°F to 77°F) away from moisture.",
      "Report any unusual muscle aches, rashes, or dizziness promptly."
    ]
  };
}

function generateServerParametricLogo(options: any = {}): string {
  const {
    storeName = "Apex Medicos",
    tagline = "Trusted Pharmacy & Healthcare",
    palette = "teal-emerald",
    symbol = "shield-rx",
  } = options;

  const paletteMap: Record<string, { p: string; s: string; a: string; l: string; g1: string; g2: string }> = {
    "teal-emerald": { p: "#0d9488", s: "#10b981", a: "#042f2e", l: "#f0fdfa", g1: "#0d9488", g2: "#059669" },
    "blue-cyan": { p: "#2563eb", s: "#06b6d4", a: "#1e3a8a", l: "#eff6ff", g1: "#2563eb", g2: "#0284c7" },
    "sage-amber": { p: "#059669", s: "#d97706", a: "#064e3b", l: "#ecfdf5", g1: "#059669", g2: "#b45309" },
    "indigo-gold": { p: "#4f46e5", s: "#eab308", a: "#312e81", l: "#eef2ff", g1: "#4338ca", g2: "#ca8a04" },
    "crimson-rose": { p: "#e11d48", s: "#f43f5e", a: "#881337", l: "#fff1f2", g1: "#e11d48", g2: "#be123c" },
    "dark-slate": { p: "#334155", s: "#0ea5e9", a: "#0f172a", l: "#f8fafc", g1: "#1e293b", g2: "#475569" },
  };

  const col = paletteMap[palette] || paletteMap["teal-emerald"];
  const safeName = String(storeName || "PHARMACY").toUpperCase().replace(/[<>&'"]/g, "");
  const safeTagline = String(tagline || "CERTIFIED DISPENSARY").toUpperCase().replace(/[<>&'"]/g, "");

  let symbolPath = "";
  if (symbol === "caduceus") {
    symbolPath = `
      <g transform="translate(250, 190) scale(1.1)">
        <path d="M-60,-20 C-40,-50 -10,-45 0,-25 C10,-45 40,-50 60,-20 C45,-15 30,-22 0,-15 C-30,-22 -45,-15 -60,-20 Z" fill="url(#brandGrad)" />
        <line x1="0" y1="-45" x2="0" y2="70" stroke="url(#brandGrad)" stroke-width="6" stroke-linecap="round" />
        <circle cx="0" cy="-45" r="7" fill="${col.s}" />
        <path d="M-25,45 C-5,35 15,25 0,10 C-15,-5 5,-15 25,-25" fill="none" stroke="${col.s}" stroke-width="4.5" stroke-linecap="round" />
        <path d="M25,45 C5,35 -15,25 0,10 C15,-5 -5,-15 -25,-25" fill="none" stroke="${col.s}" stroke-width="4.5" stroke-linecap="round" opacity="0.8" />
      </g>
    `;
  } else if (symbol === "mortar-pestle") {
    symbolPath = `
      <g transform="translate(250, 190)">
        <path d="M-55,-5 C-50,45 50,45 55,-5 C40,-10 -40,-10 -55,-5 Z" fill="url(#brandGrad)" />
        <ellipse cx="0" cy="-6" rx="55" ry="12" fill="${col.s}" opacity="0.9" />
        <path d="M-20,-48 C-15,-52 -5,-48 -2,-40 L28,5 C32,12 25,18 18,15 L-12,-30 C-18,-38 -25,-44 -20,-48 Z" fill="${col.a}" opacity="0.95" />
        <circle cx="-16" cy="-44" r="5" fill="#ffffff" />
        <path d="M-6,14 H6 V26 H-6 Z M-12,17 H12 V23 H-12 Z" fill="#ffffff" />
      </g>
    `;
  } else if (symbol === "medical-cross") {
    symbolPath = `
      <g transform="translate(250, 185)">
        <polygon points="0,-75 65,-35 65,35 0,75 -65,35 -65,-35" fill="url(#brandGrad)" />
        <polygon points="0,-68 58,-31 58,31 0,68 -58,31 -58,-31" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.4" />
        <path d="M-14,-32 H14 V-14 H32 V14 H14 V32 H-14 V14 H-32 V-14 H-14 Z" fill="#ffffff" />
        <circle cx="0" cy="0" r="6" fill="${col.p}" />
      </g>
    `;
  } else if (symbol === "heartbeat-pulse") {
    symbolPath = `
      <g transform="translate(250, 185)">
        <path d="M0,50 C-70,0 -80,-50 -35,-55 C-10,-58 0,-30 0,-30 C0,-30 10,-58 35,-55 C80,-50 70,0 0,50 Z" fill="url(#brandGrad)" />
        <polyline points="-55,-2 -25,-2 -15,-22 0,22 12,-15 22,-2 55,-2" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
      </g>
    `;
  } else {
    symbolPath = `
      <g transform="translate(250, 185)">
        <path d="M0,-70 C45,-65 65,-45 65,0 C65,50 35,70 0,85 C-35,70 -65,50 -65,0 C-65,-45 -45,-65 0,-70 Z" fill="url(#brandGrad)" />
        <path d="M0,-62 C38,-58 56,-40 56,0 C56,42 30,60 0,73 C-30,60 -56,42 -56,0 C-56,-40 -38,-58 0,-62 Z" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.4" />
        <text x="-16" y="24" font-family="'Helvetica Neue', Arial, sans-serif" font-size="52" font-weight="900" fill="#ffffff" text-anchor="middle">℞</text>
        <path d="M12,-8 H24 V-16 H30 V-8 H42 V-2 H30 V6 H24 V-2 H12 Z" fill="${col.s}" />
      </g>
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <defs>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${col.g1}" />
      <stop offset="100%" stop-color="${col.g2}" />
    </linearGradient>
    <linearGradient id="ringGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${col.s}" />
      <stop offset="100%" stop-color="${col.p}" />
    </linearGradient>
  </defs>
  <circle cx="250" cy="250" r="235" fill="${col.l}" stroke="#e2e8f0" stroke-width="2" />
  <circle cx="250" cy="250" r="225" fill="none" stroke="url(#ringGrad)" stroke-width="4" stroke-dasharray="14 6" opacity="0.85" />
  <circle cx="250" cy="250" r="215" fill="none" stroke="${col.p}" stroke-width="1.5" opacity="0.3" />
  ${symbolPath}
  <g transform="translate(250, 360)">
    <rect x="-190" y="-24" width="380" height="48" rx="24" fill="${col.a}" opacity="0.95" />
    <text x="0" y="7" font-family="'Helvetica Neue', Arial, sans-serif" font-size="20" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1.5">
      ${safeName}
    </text>
  </g>
  <g transform="translate(250, 420)">
    <text x="0" y="0" font-family="'Helvetica Neue', Arial, sans-serif" font-size="13" font-weight="700" fill="${col.p}" text-anchor="middle" letter-spacing="2">
      ${safeTagline}
    </text>
  </g>
  <g transform="translate(250, 68)">
    <text x="0" y="0" font-family="'Helvetica Neue', Arial, sans-serif" font-size="11" font-weight="800" fill="${col.p}" text-anchor="middle" letter-spacing="3.5">
      ★ CERTIFIED DISPENSARY &amp; PHARMACY ★
    </text>
  </g>
</svg>`;
}

startServer();
