package com.icumanager.app.ui.dashboard;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import com.icumanager.app.service.NotificationService;
import com.icumanager.app.ui.auth.LoginActivity;
import com.icumanager.app.ui.main.DashboardOrderAdapter;
import com.icumanager.app.ui.main.NotificationReminderAdapter;

import android.app.AlertDialog;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class DashboardActivity extends AppCompatActivity {

    // ── Views ──────────────────────────────────────────────────────────────
    private boolean notificationsExpanded = true;
    private RecyclerView recyclerViewPatients;
    private RecyclerView recyclerViewOrders;
    private RecyclerView recyclerViewReminders;
    private RecyclerView recyclerViewNotifications;
    private LinearLayout layoutReminders;
    private LinearLayout layoutNotifications;
    private TextView textNoOrders;

    private PatientAdapter patientAdapter;
    private DashboardOrderAdapter orderAdapter;
    private NotificationReminderAdapter reminderAdapter;
    private com.icumanager.app.ui.main.SystemNotificationAdapter notificationAdapter;

    private ProgressBar progressBar;
    private TextView textError;
    private LinearLayout layoutActiveShift;
    private TextView textShiftStatus;

    private Button btnStartShift;
    private Button btnEndShift;
    private Button btnShiftHistory;
    private Button btnAdmin;

    private androidx.appcompat.app.ActionBarDrawerToggle toggle;

    // Tab buttons
    private Button btnTabActive;
    private Button btnTabRecent;
    private Button btnTabCompleted;

    // Cached order lists per tab
    private JSONArray activeOrders = new JSONArray();
    private JSONArray recentOrders = new JSONArray();
    private JSONArray completedOrders = new JSONArray();

    private android.os.Handler pollHandler = new android.os.Handler();
    private Runnable backgroundPoller;

    private static final SimpleDateFormat API_FORMAT = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);

    // ── Lifecycle ──────────────────────────────────────────────────────────
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_dashboard);

        // Sidebar Navigation
        androidx.drawerlayout.widget.DrawerLayout drawerLayout = findViewById(R.id.drawerLayout);
        androidx.appcompat.widget.Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        toggle = new androidx.appcompat.app.ActionBarDrawerToggle(
                this, drawerLayout, toolbar, 0, 0);
        drawerLayout.addDrawerListener(toggle);
        toggle.syncState();

        // Patients
        recyclerViewPatients = findViewById(R.id.recyclerViewPatients);
        recyclerViewPatients.setLayoutManager(new LinearLayoutManager(this));
        patientAdapter = new PatientAdapter();
        recyclerViewPatients.setAdapter(patientAdapter);

        // Orders
        recyclerViewOrders = findViewById(R.id.recyclerViewOrders);
        recyclerViewOrders.setLayoutManager(new LinearLayoutManager(this));
        orderAdapter = new DashboardOrderAdapter();
        recyclerViewOrders.setAdapter(orderAdapter);
        textNoOrders = findViewById(R.id.textNoOrders);

        // Reminders
        recyclerViewReminders = findViewById(R.id.recyclerViewReminders);
        layoutReminders = findViewById(R.id.layoutReminders);
        recyclerViewReminders.setLayoutManager(new LinearLayoutManager(this));
        reminderAdapter = new NotificationReminderAdapter();
        reminderAdapter.setOnMarkDoneListener((orderId, position) -> markOrderDone(orderId, position));
        recyclerViewReminders.setAdapter(reminderAdapter);

        // System Notifications (collapsible)
        recyclerViewNotifications = findViewById(R.id.recyclerViewNotifications);
        layoutNotifications = findViewById(R.id.layoutNotifications);
        LinearLayout layoutNotificationsHeader = findViewById(R.id.layoutNotificationsHeader);
        TextView textNotificationsToggle = findViewById(R.id.textNotificationsToggle);
        layoutNotificationsHeader.setOnClickListener(v -> {
            notificationsExpanded = !notificationsExpanded;
            recyclerViewNotifications.setVisibility(notificationsExpanded ? View.VISIBLE : View.GONE);
            textNotificationsToggle.setText(notificationsExpanded ? "▼" : "▶");
        });
        recyclerViewNotifications.setLayoutManager(new LinearLayoutManager(this));
        notificationAdapter = new com.icumanager.app.ui.main.SystemNotificationAdapter();
        notificationAdapter.setOnNotificationClickListener(patientId -> {
            Intent intent = new Intent(DashboardActivity.this,
                    com.icumanager.app.ui.patient.PatientDetailsActivity.class);
            intent.putExtra("PATIENT_ID", patientId); // must match PatientDetailsActivity key
            startActivity(intent);
        });
        recyclerViewNotifications.setAdapter(notificationAdapter);

        // Other views
        progressBar = findViewById(R.id.progressBar);
        textError = findViewById(R.id.textError);
        layoutActiveShift = findViewById(R.id.layoutActiveShift);
        textShiftStatus = findViewById(R.id.textShiftStatus);

        btnStartShift = findViewById(R.id.btnStartShift);
        btnEndShift = findViewById(R.id.btnEndShift);
        btnShiftHistory = findViewById(R.id.btnShiftHistory);
        btnAdmin = findViewById(R.id.btnAdmin);

        btnStartShift.setOnClickListener(v -> startShift());
        btnEndShift.setOnClickListener(v -> endShift());
        btnShiftHistory.setOnClickListener(v -> {
            startActivity(new Intent(this, com.icumanager.app.ui.reports.ShiftHistoryActivity.class));
        });
        btnAdmin.setOnClickListener(v -> {
            startActivity(new Intent(this, com.icumanager.app.ui.admin.AdminDashboardActivity.class));
        });

        // Add Patient FAB — only visible to SENIOR/RESIDENT
        com.google.android.material.floatingactionbutton.FloatingActionButton fabAddPatient =
                findViewById(R.id.fabAddPatient);
        fabAddPatient.setOnClickListener(v -> {
            startActivityForResult(
                    new Intent(this, com.icumanager.app.ui.patient.AddPatientActivity.class), 999);
        });

        checkUserRole();

        // Tab buttons
        btnTabActive = findViewById(R.id.btnTabActive);
        btnTabRecent = findViewById(R.id.btnTabRecent);
        btnTabCompleted = findViewById(R.id.btnTabCompleted);

        btnTabActive.setOnClickListener(v -> showTab("active"));
        btnTabRecent.setOnClickListener(v -> showTab("recent"));
        btnTabCompleted.setOnClickListener(v -> showTab("completed"));

        backgroundPoller = new Runnable() {
            @Override
            public void run() {
                String token = getToken();
                if (token != null) {
                    fetchDueReminders(token);
                }
                pollHandler.postDelayed(this, 15000); // 15 seconds polling for quick feedback
            }
        };

        fetchDashboardData();
        pollHandler.post(backgroundPoller);

        // Start foreground notification service (SSE-based push notifications)
        startNotificationService();
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Refresh data every time the user returns to the dashboard
        // (e.g. after adding a patient, creating an order, or returning from patient details)
        fetchDashboardData();
    }

    private void startNotificationService() {
        Intent serviceIntent = new Intent(this, NotificationService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }

    private void fetchSystemNotifications(String token) {
        ApiClient.get("/notifications", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                runOnUiThread(() -> {
                    try {
                        JSONArray notifications = new JSONArray(responseStr);
                        if (notifications.length() > 0) {
                            notificationAdapter.setNotifications(notifications);
                            layoutNotifications.setVisibility(View.VISIBLE);
                        } else {
                            layoutNotifications.setVisibility(View.GONE);
                        }
                    } catch (Exception e) {
                        layoutNotifications.setVisibility(View.GONE);
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> layoutNotifications.setVisibility(View.GONE));
            }
        });
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        pollHandler.removeCallbacks(backgroundPoller);
        stopService(new Intent(this, NotificationService.class));
    }

    // ── Token ──────────────────────────────────────────────────────────────
    private String getToken() {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        return prefs.getString("auth_token", null);
    }

    // ── Tabs ───────────────────────────────────────────────────────────────
    private void showTab(String tab) {
        // Reset all buttons to inactive style
        int inactiveColor = Color.parseColor("#334155");
        int activeColor = Color.parseColor("#3B82F6");
        int inactiveTxt = Color.parseColor("#94A3B8");
        int activeTxt = Color.WHITE;

        btnTabActive.setBackgroundTintList(android.content.res.ColorStateList.valueOf(inactiveColor));
        btnTabRecent.setBackgroundTintList(android.content.res.ColorStateList.valueOf(inactiveColor));
        btnTabCompleted.setBackgroundTintList(android.content.res.ColorStateList.valueOf(inactiveColor));
        btnTabActive.setTextColor(inactiveTxt);
        btnTabRecent.setTextColor(inactiveTxt);
        btnTabCompleted.setTextColor(inactiveTxt);

        JSONArray list;
        switch (tab) {
            case "recent":
                btnTabRecent.setBackgroundTintList(android.content.res.ColorStateList.valueOf(activeColor));
                btnTabRecent.setTextColor(activeTxt);
                list = recentOrders;
                break;
            case "completed":
                btnTabCompleted.setBackgroundTintList(android.content.res.ColorStateList.valueOf(activeColor));
                btnTabCompleted.setTextColor(activeTxt);
                list = completedOrders;
                break;
            default: // "active"
                btnTabActive.setBackgroundTintList(android.content.res.ColorStateList.valueOf(activeColor));
                btnTabActive.setTextColor(activeTxt);
                list = activeOrders;
                break;
        }

        orderAdapter.setOrders(list);
        if (list.length() == 0) {
            textNoOrders.setVisibility(View.VISIBLE);
            recyclerViewOrders.setVisibility(View.GONE);
        } else {
            textNoOrders.setVisibility(View.GONE);
            recyclerViewOrders.setVisibility(View.VISIBLE);
        }
    }

    // ── Data Fetch ─────────────────────────────────────────────────────────
    private void fetchDashboardData() {
        String token = getToken();
        if (token == null) {
            startActivity(new Intent(this, LoginActivity.class));
            finish();
            return;
        }

        setLoading(true);

        // Fetch patients
        ApiClient.get("/patients", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(final String responseStr) {
                runOnUiThread(() -> {
                    setLoading(false);
                    try {
                        JSONArray allPatients = new JSONArray(responseStr);
                        JSONArray admittedPatients = new JSONArray();
                        for (int i = 0; i < allPatients.length(); i++) {
                            JSONObject p = allPatients.optJSONObject(i);
                            if (p != null) {
                                String status = p.optString("status", "ADMITTED");
                                if (!"DISCHARGED".equalsIgnoreCase(status)) {
                                    admittedPatients.put(p);
                                }
                            }
                        }
                        patientAdapter.setPatients(admittedPatients);
                        checkActiveShift(token);
                        fetchActiveOrders(token);
                        fetchRecentOrders(token);
                        fetchCompletedOrders(token);
                        fetchSystemNotifications(token);
                    } catch (JSONException e) {
                        showError("Failed to parse patient list from server.");
                    }
                });
            }

            @Override
            public void onError(final Exception error) {
                runOnUiThread(() -> {
                    setLoading(false);
                    showError("Network Error: " + error.getMessage());
                });
            }
        });
    }

    private void fetchActiveOrders(String token) {
        ApiClient.get("/orders/active", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                runOnUiThread(() -> {
                    try {
                        activeOrders = new JSONArray(responseStr);
                        // Refresh active tab if currently shown
                        showTab("active");
                    } catch (Exception e) {
                    }
                });
            }

            @Override
            public void onError(Exception error) {
            }
        });
    }

    private void fetchDueReminders(String token) {
        ApiClient.get("/orders/due-reminders", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                runOnUiThread(() -> {
                    try {
                        JSONArray reminders = new JSONArray(responseStr);
                        if (reminders.length() > 0) {
                            reminderAdapter.setReminders(reminders);
                            layoutReminders.setVisibility(View.VISIBLE);
                        } else {
                            layoutReminders.setVisibility(View.GONE);
                        }
                    } catch (Exception e) {
                        layoutReminders.setVisibility(View.GONE);
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> layoutReminders.setVisibility(View.GONE));
            }
        });
    }

    private void fetchRecentOrders(String token) {
        ApiClient.get("/orders/recent", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                runOnUiThread(() -> {
                    try {
                        recentOrders = new JSONArray(responseStr);
                    } catch (JSONException ignored) {
                        recentOrders = new JSONArray();
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                recentOrders = new JSONArray();
            }
        });
    }

    private void fetchCompletedOrders(String token) {
        ApiClient.get("/orders/completed", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                runOnUiThread(() -> {
                    try {
                        completedOrders = new JSONArray(responseStr);
                    } catch (JSONException ignored) {
                        completedOrders = new JSONArray();
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                completedOrders = new JSONArray();
            }
        });
    }

    // ── Mark Intervention Done ─────────────────────────────────────────────
    private void markOrderDone(String orderId, int adapterPosition) {
        new AlertDialog.Builder(this)
                .setTitle("Complete Check")
                .setMessage("Are you sure you want to mark this intervention check as completed?")
                .setPositiveButton("Complete", (dialog, which) -> executeMarkOrderDone(orderId, adapterPosition))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void executeMarkOrderDone(String orderId, int adapterPosition) {
        String token = getToken();
        if (token == null)
            return;

        try {
            JSONObject body = new JSONObject();
            body.put("status", "COMPLETED");
            body.put("userId", getUserId());

            ApiClient.patch("/orders/" + orderId + "/status", body.toString(), token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String responseStr) {
                    runOnUiThread(() -> {
                        reminderAdapter.removeAt(adapterPosition);
                        if (reminderAdapter.getItemCount() == 0) {
                            layoutReminders.setVisibility(View.GONE);
                        }
                        Toast.makeText(DashboardActivity.this, "Intervention marked done", Toast.LENGTH_SHORT).show();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> Toast.makeText(DashboardActivity.this,
                            "Failed to mark done", Toast.LENGTH_SHORT).show());
                }
            });
        } catch (JSONException e) {
            Toast.makeText(this, "Error preparing request", Toast.LENGTH_SHORT).show();
        }
    }

    private String getUserId() {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        return prefs.getString("user_id", "");
    }

    private void checkUserRole() {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String role = prefs.getString("user_role", "");

        // Admin panel only for SENIOR
        btnAdmin.setVisibility("SENIOR".equals(role) ? View.VISIBLE : View.GONE);

        // Add Patient FAB only for SENIOR and RESIDENT (not NURSE)
        com.google.android.material.floatingactionbutton.FloatingActionButton fabAddPatient =
                findViewById(R.id.fabAddPatient);
        fabAddPatient.setVisibility("NURSE".equals(role) ? View.GONE : View.VISIBLE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable android.content.Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 999 && resultCode == android.app.Activity.RESULT_OK) {
            // Patient was added — refresh the dashboard
            fetchDashboardData();
        }
    }

    // ── Shift Status ───────────────────────────────────────────────────────
    private void checkActiveShift(String token) {
        ApiClient.get("/shifts/status", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(final String responseStr) {
                runOnUiThread(() -> {
                    try {
                        JSONObject response = new JSONObject(responseStr);
                        if (response.has("data") && !response.isNull("data")
                                && response.getJSONObject("data").has("activeShift")) {
                            JSONObject shift = response.getJSONObject("data").getJSONObject("activeShift");
                            // Extract user name for banner
                            String userName = "Active";
                            if (shift.has("user")) {
                                userName = shift.getJSONObject("user").optString("name", "Active");
                            }
                            layoutActiveShift.setVisibility(View.VISIBLE);
                            textShiftStatus.setText("Active Shift: " + userName);

                            btnStartShift.setVisibility(View.GONE);
                            btnEndShift.setVisibility(View.VISIBLE);
                        } else {
                            layoutActiveShift.setVisibility(View.GONE);
                            btnStartShift.setVisibility(View.VISIBLE);
                            btnEndShift.setVisibility(View.GONE);
                        }
                    } catch (JSONException e) {
                        layoutActiveShift.setVisibility(View.GONE);
                        btnStartShift.setVisibility(View.VISIBLE);
                        btnEndShift.setVisibility(View.GONE);
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> {
                    layoutActiveShift.setVisibility(View.GONE);
                    btnStartShift.setVisibility(View.VISIBLE);
                    btnEndShift.setVisibility(View.GONE);
                });
            }
        });
    }

    private void startShift() {
        String token = getToken();
        if (token == null)
            return;

        ApiClient.post("/shifts/start", new JSONObject(), token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                runOnUiThread(() -> {
                    Toast.makeText(DashboardActivity.this, "Shift Started", Toast.LENGTH_SHORT).show();
                    checkActiveShift(token);
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> Toast.makeText(DashboardActivity.this,
                        "Failed to start shift: " + error.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    private void endShift() {
        String token = getToken();
        if (token == null)
            return;

        ApiClient.post("/shifts/end", new JSONObject(), token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                runOnUiThread(() -> {
                    Toast.makeText(DashboardActivity.this, "Shift Ended", Toast.LENGTH_SHORT).show();
                    checkActiveShift(token);
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> Toast.makeText(DashboardActivity.this, "Failed to end shift: " + error.getMessage(),
                        Toast.LENGTH_LONG).show());
            }
        });
    }

    private void showShiftHistory() {
        String token = getToken();
        if (token == null)
            return;

        ApiClient.get("/shifts/history", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                runOnUiThread(() -> {
                    try {
                        JSONObject response = new JSONObject(responseStr);
                        JSONArray history = response.getJSONObject("data").getJSONArray("shifts");

                        StringBuilder sb = new StringBuilder();
                        for (int i = 0; i < history.length(); i++) {
                            JSONObject shift = history.getJSONObject(i);
                            String start = shift.optString("startTime", "Unknown");
                            String end = shift.optString("endTime", "Ongoing");
                            if (start.length() > 16)
                                start = start.substring(0, 16).replace("T", " ");
                            if (end.length() > 16)
                                end = end.substring(0, 16).replace("T", " ");

                            sb.append("Start: ").append(start).append("\n");
                            sb.append("End: ").append(end).append("\n");
                            sb.append("Status: ").append(shift.optString("status", "Unknown")).append("\n\n");
                        }

                        String display = sb.toString().trim();
                        if (display.isEmpty())
                            display = "No shift history found.";

                        new AlertDialog.Builder(DashboardActivity.this)
                                .setTitle("Shift History")
                                .setMessage(display)
                                .setPositiveButton("Close", null)
                                .show();
                    } catch (JSONException e) {
                        Toast.makeText(DashboardActivity.this, "Failed to parse history", Toast.LENGTH_SHORT).show();
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> Toast.makeText(DashboardActivity.this,
                        "Failed to fetch history: " + error.getMessage(), Toast.LENGTH_LONG).show());
            }
        });
    }

    // ── Util ───────────────────────────────────────────────────────────────
    private void setLoading(boolean isLoading) {
        progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
        if (isLoading)
            textError.setVisibility(View.GONE);
    }

    private void showError(String message) {
        textError.setText(message);
        textError.setVisibility(View.VISIBLE);
        recyclerViewPatients.setVisibility(View.GONE);
    }

    @Override
    public boolean onCreateOptionsMenu(android.view.Menu menu) {
        getMenuInflater().inflate(R.menu.dashboard_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(android.view.MenuItem item) {
        if (toggle.onOptionsItemSelected(item)) {
            return true;
        }
        if (item.getItemId() == R.id.action_notifications) {
            startActivity(new Intent(this, com.icumanager.app.ui.main.NotificationsActivity.class));
            return true;
        }
        return super.onOptionsItemSelected(item);
    }
}
