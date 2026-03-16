package com.icumanager.app.ui.patient;

import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import android.content.Intent;
import android.app.Activity;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class InterventionsFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;
    private InterventionsAdapter adapter;

    private LinearLayout layoutReminderBanner, layoutBannerItems;
    private TextView textBannerCount;

    private Handler pollHandler = new Handler();
    private Runnable pollRunnable;

    public static InterventionsFragment newInstance(String patientId) {
        InterventionsFragment f = new InterventionsFragment();
        Bundle args = new Bundle();
        args.putString(ARG_PATIENT_ID, patientId);
        f.setArguments(args);
        return f;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) patientId = getArguments().getString(ARG_PATIENT_ID);
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_interventions, container, false);

        layoutReminderBanner = view.findViewById(R.id.layoutReminderBanner);
        layoutBannerItems    = view.findViewById(R.id.layoutBannerItems);
        textBannerCount      = view.findViewById(R.id.textBannerCount);

        RecyclerView recyclerView = view.findViewById(R.id.recyclerViewInterventions);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new InterventionsAdapter();
        recyclerView.setAdapter(adapter);

        FloatingActionButton fab = view.findViewById(R.id.fabAddIntervention);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getContext(), AddInterventionActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, 100);
        });

        loadInterventions();

        // Poll every 60 s for due reminders
        pollRunnable = new Runnable() {
            @Override public void run() {
                loadInterventions();
                pollHandler.postDelayed(this, 60000);
            }
        };
        pollHandler.postDelayed(pollRunnable, 60000);

        return view;
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        pollHandler.removeCallbacks(pollRunnable);
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 100 && resultCode == Activity.RESULT_OK) loadInterventions();
    }

    private String getToken() {
        if (getActivity() == null) return null;
        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        return prefs.getString("auth_token", null);
    }

    private String getUserId() {
        if (getActivity() == null) return "";
        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        return prefs.getString("user_id", "");
    }

    private void loadInterventions() {
        if (getActivity() == null) return;
        String token = getToken();

        ApiClient.get("/orders/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    try {
                        JSONArray allOrders = new JSONArray(responseStr);
                        JSONArray procedures = new JSONArray();
                        JSONArray dueReminders = new JSONArray();
                        long now = System.currentTimeMillis();

                        for (int i = 0; i < allOrders.length(); i++) {
                            JSONObject order = allOrders.optJSONObject(i);
                            if (order == null || !"PROCEDURE".equals(order.optString("type"))) continue;
                            procedures.put(order);

                            // Check if reminder is due
                            String reminderAt = order.optString("reminderAt", "");
                            String status = order.optString("status", "");
                            if (!reminderAt.isEmpty() && !"COMPLETED".equals(status)) {
                                try {
                                    SimpleDateFormat fmt = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
                                    Date reminderDate = fmt.parse(reminderAt);
                                    if (reminderDate != null && reminderDate.getTime() <= now) {
                                        dueReminders.put(order);
                                    }
                                } catch (Exception ignored) {}
                            }
                        }

                        adapter.setOrders(procedures);
                        updateReminderBanner(dueReminders);
                    } catch (Exception e) {
                        Toast.makeText(getContext(), "Failed to parse Interventions", Toast.LENGTH_SHORT).show();
                    }
                });
            }
            @Override
            public void onError(Exception error) {
                if (getActivity() != null)
                    getActivity().runOnUiThread(() ->
                        Toast.makeText(getContext(), "Network error: " + error.getMessage(), Toast.LENGTH_SHORT).show());
            }
        });
    }

    private void updateReminderBanner(JSONArray dueReminders) {
        layoutBannerItems.removeAllViews();
        if (dueReminders.length() == 0) {
            layoutReminderBanner.setVisibility(View.GONE);
            return;
        }

        layoutReminderBanner.setVisibility(View.VISIBLE);
        textBannerCount.setText(dueReminders.length() + " Check Reminder" + (dueReminders.length() > 1 ? "s Due" : " Due"));

        for (int i = 0; i < dueReminders.length(); i++) {
            JSONObject order = dueReminders.optJSONObject(i);
            if (order == null) continue;

            String orderId = order.optString("id", "");
            JSONObject details = order.optJSONObject("details");
            String notifText = (details != null && details.has("notificationText"))
                ? details.optString("notificationText") : order.optString("title", "Check");

            LinearLayout row = new LinearLayout(getContext());
            row.setOrientation(LinearLayout.HORIZONTAL);
            row.setPadding(0, 8, 0, 8);
            row.setGravity(android.view.Gravity.CENTER_VERTICAL);

            TextView tvText = new TextView(getContext());
            tvText.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
            tvText.setText("⏰ " + notifText);
            tvText.setTextColor(Color.parseColor("#FEF3C7"));
            tvText.setTextSize(12f);

            Button btnComplete = new Button(getContext());
            LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            btnParams.setMarginStart(8);
            btnComplete.setLayoutParams(btnParams);
            btnComplete.setText("Complete");
            btnComplete.setTextSize(10f);
            btnComplete.setTextColor(Color.WHITE);
            btnComplete.setBackgroundColor(Color.parseColor("#16A34A"));
            btnComplete.setPadding(16, 4, 16, 4);
            final String finalOrderId = orderId;
            final String finalText = notifText;
            btnComplete.setOnClickListener(v -> confirmComplete(finalOrderId, finalText));

            row.addView(tvText);
            row.addView(btnComplete);
            layoutBannerItems.addView(row);
        }
    }

    private void confirmComplete(String orderId, String title) {
        new AlertDialog.Builder(getActivity())
            .setTitle("Complete Check")
            .setMessage("Mark \"" + title + "\" as completed?")
            .setPositiveButton("Complete", (d, w) -> markComplete(orderId))
            .setNegativeButton("Cancel", null)
            .show();
    }

    private void markComplete(String orderId) {
        String token = getToken();
        try {
            JSONObject body = new JSONObject();
            body.put("status", "COMPLETED");
            body.put("userId", getUserId());
            ApiClient.patch("/orders/" + orderId + "/status", body.toString(), token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String r) {
                    if (getActivity() != null)
                        getActivity().runOnUiThread(() -> {
                            Toast.makeText(getContext(), "Check completed", Toast.LENGTH_SHORT).show();
                            loadInterventions();
                        });
                }
                @Override
                public void onError(Exception e) {
                    if (getActivity() != null)
                        getActivity().runOnUiThread(() ->
                            Toast.makeText(getContext(), "Failed: " + e.getMessage(), Toast.LENGTH_SHORT).show());
                }
            });
        } catch (JSONException e) {
            Toast.makeText(getContext(), "JSON error", Toast.LENGTH_SHORT).show();
        }
    }
}
