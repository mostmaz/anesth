package com.icumanager.app.ui.main;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.appbar.MaterialToolbar;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import com.icumanager.app.ui.patient.PatientDetailsActivity;

import org.json.JSONArray;

public class NotificationsActivity extends AppCompatActivity {

    private RecyclerView recyclerView;
    private SystemNotificationAdapter adapter;
    private ProgressBar progressBar;
    private TextView textError;
    private TextView textNoNotifications;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_notifications);

        MaterialToolbar toolbar = findViewById(R.id.toolbarNotifications);
        toolbar.setNavigationOnClickListener(v -> finish());

        recyclerView = findViewById(R.id.recyclerViewNotifications);
        progressBar = findViewById(R.id.progressBar);
        textError = findViewById(R.id.textError);
        textNoNotifications = findViewById(R.id.textNoNotifications);

        recyclerView.setLayoutManager(new LinearLayoutManager(this));
        adapter = new SystemNotificationAdapter();
        adapter.setOnNotificationClickListener(patientId -> {
            Intent intent = new Intent(this, PatientDetailsActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivity(intent);
        });
        recyclerView.setAdapter(adapter);

        fetchNotifications();
    }

    private String getToken() {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        return prefs.getString("auth_token", null);
    }

    private void fetchNotifications() {
        String token = getToken();
        if (token == null)
            return;

        progressBar.setVisibility(View.VISIBLE);
        textError.setVisibility(View.GONE);
        textNoNotifications.setVisibility(View.GONE);

        ApiClient.get("/investigations", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    try {
                        JSONArray notifications = new JSONArray(responseStr);
                        if (notifications.length() > 0) {
                            adapter.setNotifications(notifications);
                            recyclerView.setVisibility(View.VISIBLE);
                        } else {
                            textNoNotifications.setVisibility(View.VISIBLE);
                            recyclerView.setVisibility(View.GONE);
                        }
                    } catch (Exception e) {
                        showError("Failed to parse notifications.");
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    showError("Network error: " + error.getMessage());
                });
            }
        });
    }

    private void showError(String msg) {
        textError.setText(msg);
        textError.setVisibility(View.VISIBLE);
        recyclerView.setVisibility(View.GONE);
    }
}
