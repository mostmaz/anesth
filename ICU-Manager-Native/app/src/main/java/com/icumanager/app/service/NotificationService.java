package com.icumanager.app.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.icumanager.app.R;
import com.icumanager.app.ui.dashboard.DashboardActivity;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Foreground service that maintains a Server-Sent Events (SSE) connection to the
 * backend and posts local Android notifications for:
 *   - new_admission   → new patient admitted
 *   - new_order       → new clinical order created
 *   - new_investigation → lab / imaging result available
 *   - system_update   → general system notification
 */
public class NotificationService extends Service {

    private static final String TAG = "NotificationService";

    // ── Notification channels ──────────────────────────────────────────────
    public static final String CHANNEL_FOREGROUND    = "icu_foreground";
    public static final String CHANNEL_ADMISSION     = "icu_admission";
    public static final String CHANNEL_ORDER         = "icu_order";
    public static final String CHANNEL_INVESTIGATION = "icu_investigation";
    public static final String CHANNEL_SYSTEM        = "icu_system";

    private static final int NOTIF_ID_FOREGROUND = 1;

    private static final String BASE_URL = "http://161.35.216.33:3001/api";

    private Thread sseThread;
    private volatile boolean running = false;

    // ── Service lifecycle ──────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannels();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIF_ID_FOREGROUND, buildForegroundNotification());
        if (!running) {
            running = true;
            startSseConnection();
        }
        return START_STICKY; // Restart automatically if killed by the system
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        running = false;
        if (sseThread != null) {
            sseThread.interrupt();
        }
        super.onDestroy();
    }

    // ── SSE connection ─────────────────────────────────────────────────────

    private void startSseConnection() {
        sseThread = new Thread(() -> {
            while (running) {
                try {
                    connectAndReadSse();
                } catch (InterruptedException e) {
                    break; // Service is stopping
                } catch (Exception e) {
                    Log.w(TAG, "SSE connection lost, reconnecting in 5s: " + e.getMessage());
                }

                // Back-off before reconnect
                if (running) {
                    try {
                        Thread.sleep(5000);
                    } catch (InterruptedException e) {
                        break;
                    }
                }
            }
        });
        sseThread.setDaemon(true);
        sseThread.start();
    }

    private void connectAndReadSse() throws Exception {
        String token = getToken();
        URL url = new URL(BASE_URL + "/notifications/stream");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Accept", "text/event-stream");
        conn.setRequestProperty("Cache-Control", "no-cache");
        if (token != null && !token.isEmpty()) {
            conn.setRequestProperty("Authorization", "Bearer " + token);
        }
        conn.setConnectTimeout(15000);
        conn.setReadTimeout(0); // No read timeout — we want to keep the stream alive

        int status = conn.getResponseCode();
        if (status != 200) {
            conn.disconnect();
            throw new Exception("HTTP " + status);
        }

        Log.i(TAG, "SSE stream connected");

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), "utf-8"))) {

            String line;
            while (running && (line = reader.readLine()) != null) {
                if (Thread.currentThread().isInterrupted()) break;

                // SSE lines starting with "data: " carry the payload
                if (line.startsWith("data: ")) {
                    String json = line.substring(6).trim();
                    handleSseEvent(json);
                }
                // Lines starting with ":" are keep-alive pings — ignore them
            }
        } finally {
            conn.disconnect();
        }
    }

    // ── Event handling ─────────────────────────────────────────────────────

    private void handleSseEvent(String json) {
        try {
            JSONObject obj = new JSONObject(json);
            String type = obj.optString("type", "");

            switch (type) {
                case "new_admission":
                    postNotification(
                            CHANNEL_ADMISSION,
                            2000,
                            "🏥 New Admission",
                            obj.optString("message", "A new patient has been admitted"),
                            obj.optString("patientId", null)
                    );
                    break;

                case "new_order":
                    postNotification(
                            CHANNEL_ORDER,
                            3000,
                            "📋 New Order",
                            obj.optString("message", "A new clinical order was created"),
                            obj.optString("patientId", null)
                    );
                    break;

                case "new_investigation":
                    postNotification(
                            CHANNEL_INVESTIGATION,
                            4000,
                            "🔬 Investigation Result",
                            obj.optString("message", "New investigation result available"),
                            obj.optString("patientId", null)
                    );
                    break;

                case "system_update":
                    postNotification(
                            CHANNEL_SYSTEM,
                            5000,
                            "⚙️ System Update",
                            obj.optString("message", "System update"),
                            null
                    );
                    break;

                case "intervention_reminder":
                    postNotification(
                            CHANNEL_ORDER,
                            6000,
                            "⏰ Intervention Reminder",
                            obj.optString("message", "Intervention due"),
                            obj.optString("patientId", null)
                    );
                    break;

                default:
                    Log.d(TAG, "Unknown SSE event type: " + type);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse SSE event: " + json, e);
        }
    }

    // ── Notification helpers ───────────────────────────────────────────────

    private void postNotification(String channel, int baseId, String title, String body, String patientId) {
        Intent tapIntent = new Intent(this, DashboardActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (patientId != null) {
            tapIntent.putExtra("patient_id", patientId);
        }

        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                : PendingIntent.FLAG_UPDATE_CURRENT;

        PendingIntent pi = PendingIntent.getActivity(this, baseId, tapIntent, flags);

        Notification notif = new NotificationCompat.Builder(this, channel)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi)
                .build();

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        // Use a unique ID per notification by combining base + time to avoid overwriting rapid alerts
        int notifId = baseId + (int) (System.currentTimeMillis() % 1000);
        nm.notify(notifId, notif);
    }

    private Notification buildForegroundNotification() {
        Intent tapIntent = new Intent(this, DashboardActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                ? PendingIntent.FLAG_IMMUTABLE : 0;
        PendingIntent pi = PendingIntent.getActivity(this, 0, tapIntent, flags);

        return new NotificationCompat.Builder(this, CHANNEL_FOREGROUND)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("ICU Manager")
                .setContentText("Monitoring for new alerts…")
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setOngoing(true)
                .setContentIntent(pi)
                .build();
    }

    // ── Channel creation ───────────────────────────────────────────────────

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);

        nm.createNotificationChannel(new NotificationChannel(
                CHANNEL_FOREGROUND, "Service Status", NotificationManager.IMPORTANCE_MIN));

        NotificationChannel admissionCh = new NotificationChannel(
                CHANNEL_ADMISSION, "New Admissions", NotificationManager.IMPORTANCE_HIGH);
        admissionCh.setDescription("Alerts when a new patient is admitted");
        admissionCh.enableVibration(true);
        nm.createNotificationChannel(admissionCh);

        NotificationChannel orderCh = new NotificationChannel(
                CHANNEL_ORDER, "New Orders & Reminders", NotificationManager.IMPORTANCE_HIGH);
        orderCh.setDescription("Alerts for new clinical orders and intervention reminders");
        orderCh.enableVibration(true);
        nm.createNotificationChannel(orderCh);

        NotificationChannel investigationCh = new NotificationChannel(
                CHANNEL_INVESTIGATION, "Investigation Results", NotificationManager.IMPORTANCE_HIGH);
        investigationCh.setDescription("Alerts when lab or imaging results are available");
        investigationCh.enableVibration(true);
        nm.createNotificationChannel(investigationCh);

        NotificationChannel systemCh = new NotificationChannel(
                CHANNEL_SYSTEM, "System Updates", NotificationManager.IMPORTANCE_DEFAULT);
        systemCh.setDescription("General system notifications");
        nm.createNotificationChannel(systemCh);
    }

    // ── Auth token ─────────────────────────────────────────────────────────

    private String getToken() {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        return prefs.getString("auth_token", null);
    }
}
