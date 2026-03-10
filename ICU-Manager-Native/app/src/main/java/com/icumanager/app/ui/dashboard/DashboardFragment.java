package com.icumanager.app.ui.dashboard;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import com.icumanager.app.ui.main.NotificationReminderAdapter;
import com.icumanager.app.ui.main.SystemNotificationAdapter;
import com.icumanager.app.ui.patient.PatientDetailsActivity;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class DashboardFragment extends Fragment {

    private RecyclerView recyclerViewOrders;
    private RecyclerView recyclerViewReminders;
    private RecyclerView recyclerViewNotifications;
    private LinearLayout layoutReminders;
    private LinearLayout layoutNotifications;
    private TextView textNoOrders;
    private ProgressBar progressBar;
    private TextView textError;

    private DashboardOrderAdapter orderAdapter;
    private NotificationReminderAdapter reminderAdapter;
    private SystemNotificationAdapter notificationAdapter;

    private Button btnTabActive, btnTabRecent, btnTabCompleted;

    private final Handler pollHandler = new Handler(Looper.getMainLooper());
    private final Runnable backgroundPoller = new Runnable() {
        @Override
        public void run() {
            refreshData();
            pollHandler.postDelayed(this, 30000); // 30s
        }
    };

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_dashboard, container, false);

        // Orders
        recyclerViewOrders = view.findViewById(R.id.recyclerViewOrders);
        recyclerViewOrders.setLayoutManager(new LinearLayoutManager(getContext()));
        orderAdapter = new DashboardOrderAdapter();
        recyclerViewOrders.setAdapter(orderAdapter);
        textNoOrders = view.findViewById(R.id.textNoOrders);

        // Reminders
        recyclerViewReminders = view.findViewById(R.id.recyclerViewReminders);
        layoutReminders = view.findViewById(R.id.layoutReminders);
        recyclerViewReminders.setLayoutManager(new LinearLayoutManager(getContext()));
        reminderAdapter = new NotificationReminderAdapter();
        reminderAdapter.setOnMarkDoneListener((orderId, position) -> markOrderDone(orderId, position));
        recyclerViewReminders.setAdapter(reminderAdapter);

        // Notifications
        recyclerViewNotifications = view.findViewById(R.id.recyclerViewNotifications);
        layoutNotifications = view.findViewById(R.id.layoutNotifications);
        recyclerViewNotifications.setLayoutManager(new LinearLayoutManager(getContext()));
        notificationAdapter = new SystemNotificationAdapter();
        notificationAdapter.setOnNotificationClickListener(patientId -> {
            Intent intent = new Intent(getActivity(), PatientDetailsActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivity(intent);
        });
        recyclerViewNotifications.setAdapter(notificationAdapter);

        // Tabs
        btnTabActive = view.findViewById(R.id.btnTabActive);
        btnTabRecent = view.findViewById(R.id.btnTabRecent);
        btnTabCompleted = view.findViewById(R.id.btnTabCompleted);

        btnTabActive.setOnClickListener(v -> {
            switchOrderTab("ACTIVE");
            updateTabUI(btnTabActive);
        });
        btnTabRecent.setOnClickListener(v -> {
            switchOrderTab("RECENT");
            updateTabUI(btnTabRecent);
        });
        btnTabCompleted.setOnClickListener(v -> {
            switchOrderTab("COMPLETED");
            updateTabUI(btnTabCompleted);
        });

        progressBar = view.findViewById(R.id.progressBar);
        textError = view.findViewById(R.id.textError);

        pollHandler.post(backgroundPoller);

        return view;
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        pollHandler.removeCallbacks(backgroundPoller);
    }

    private void refreshData() {
        String token = getToken();
        if (token == null)
            return;
        fetchActiveOrders(token);
        fetchDueReminders(token);
        fetchSystemNotifications(token);
    }

    private void fetchActiveOrders(String token) {
        ApiClient.get("/orders/active", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() == null)
                    return;
                getActivity().runOnUiThread(() -> {
                    try {
                        JSONArray orders = new JSONArray(responseStr);
                        orderAdapter.setOrders(orders);
                        textNoOrders.setVisibility(orders.length() == 0 ? View.VISIBLE : View.GONE);
                    } catch (JSONException ignored) {
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
                if (getActivity() == null)
                    return;
                getActivity().runOnUiThread(() -> {
                    try {
                        JSONArray reminders = new JSONArray(responseStr);
                        if (reminders.length() > 0) {
                            reminderAdapter.setReminders(reminders);
                            layoutReminders.setVisibility(View.VISIBLE);
                        } else {
                            layoutReminders.setVisibility(View.GONE);
                        }
                    } catch (Exception ignored) {
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() == null)
                    return;
                getActivity().runOnUiThread(() -> layoutReminders.setVisibility(View.GONE));
            }
        });
    }

    private void fetchSystemNotifications(String token) {
        ApiClient.get("/investigations", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() == null)
                    return;
                getActivity().runOnUiThread(() -> {
                    try {
                        JSONArray notifications = new JSONArray(responseStr);
                        if (notifications.length() > 0) {
                            notificationAdapter.setNotifications(notifications);
                            layoutNotifications.setVisibility(View.VISIBLE);
                        } else {
                            layoutNotifications.setVisibility(View.GONE);
                        }
                    } catch (Exception ignored) {
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() == null)
                    return;
                getActivity().runOnUiThread(() -> layoutNotifications.setVisibility(View.GONE));
            }
        });
    }

    private void switchOrderTab(String type) {
        String token = getToken();
        if (token == null)
            return;
        String endpoint = "/orders/active";
        if (type.equals("RECENT"))
            endpoint = "/orders/recent";
        if (type.equals("COMPLETED"))
            endpoint = "/orders/completed";

        ApiClient.get(endpoint, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() == null)
                    return;
                getActivity().runOnUiThread(() -> {
                    try {
                        JSONArray orders = new JSONArray(responseStr);
                        orderAdapter.setOrders(orders);
                        textNoOrders.setVisibility(orders.length() == 0 ? View.VISIBLE : View.GONE);
                    } catch (JSONException ignored) {
                    }
                });
            }

            @Override
            public void onError(Exception error) {
            }
        });
    }

    private void updateTabUI(Button activeBtn) {
        btnTabActive.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF334155));
        btnTabRecent.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF334155));
        btnTabCompleted.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF334155));
        activeBtn.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF3B82F6));
    }

    private void markOrderDone(String orderId, int position) {
        String token = getToken();
        if (token == null)
            return;
        try {
            JSONObject body = new JSONObject();
            body.put("status", "COMPLETED");
            ApiClient.put("/orders/" + orderId + "/status", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    if (getActivity() == null)
                        return;
                    getActivity().runOnUiThread(() -> {
                        reminderAdapter.removeAt(position);
                        if (reminderAdapter.getItemCount() == 0)
                            layoutReminders.setVisibility(View.GONE);
                        refreshData();
                    });
                }

                @Override
                public void onError(Exception error) {
                }
            });
        } catch (Exception ignored) {
        }
    }

    private String getToken() {
        if (getActivity() == null)
            return null;
        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        return prefs.getString("auth_token", null);
    }
}
