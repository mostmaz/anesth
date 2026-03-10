package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.viewpager2.widget.ViewPager2;

import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.tabs.TabLayout;
import com.google.android.material.tabs.TabLayoutMediator;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import android.widget.LinearLayout;
import android.widget.Button;
import android.widget.ImageButton;
import android.os.Handler;
import android.app.AlertDialog;
import org.json.JSONArray;

import org.json.JSONException;
import org.json.JSONObject;

import android.content.Intent;
import androidx.annotation.Nullable;

public class PatientDetailsActivity extends AppCompatActivity {

    private String patientId;
    private MaterialToolbar toolbar;
    private TextView textDetailName;
    private TextView textDetailInfo;
    private TabLayout tabLayout;
    private ViewPager2 viewPager;
    private ProgressBar progressBar;

    private LinearLayout bannerReminder;
    private TextView textBannerTitle;
    private Button btnBannerComplete;
    private ImageButton btnBannerDismiss;

    private Handler reminderHandler = new Handler();
    private String currentOrderId = null;
    private boolean bannerDismissed = false;

    private final Runnable reminderPoller = new Runnable() {
        @Override
        public void run() {
            fetchDueReminders();
            reminderHandler.postDelayed(this, 60000);
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_patient_details);

        patientId = getIntent().getStringExtra("PATIENT_ID");
        if (patientId == null) {
            Toast.makeText(this, "No Patient ID provided", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        toolbar = findViewById(R.id.toolbarPatient);
        textDetailName = findViewById(R.id.textDetailName);
        textDetailInfo = findViewById(R.id.textDetailInfo);
        tabLayout = findViewById(R.id.tabLayout);
        viewPager = findViewById(R.id.viewPager);
        progressBar = findViewById(R.id.progressDetails);

        bannerReminder = findViewById(R.id.bannerReminder);
        textBannerTitle = findViewById(R.id.textBannerTitle);
        btnBannerComplete = findViewById(R.id.btnBannerComplete);
        btnBannerDismiss = findViewById(R.id.btnBannerDismiss);

        btnBannerDismiss.setOnClickListener(v -> {
            bannerReminder.setVisibility(View.GONE);
            bannerDismissed = true;
        });

        btnBannerComplete.setOnClickListener(v -> showCompleteDialog());

        toolbar.setNavigationOnClickListener(v -> finish());

        setupViewPager();
        loadPatientData();

        reminderHandler.post(reminderPoller);
    }

    @Override
    public boolean onCreateOptionsMenu(android.view.Menu menu) {
        getMenuInflater().inflate(R.menu.patient_menu, menu);
        return true;
    }

    @Override
    public boolean onOptionsItemSelected(android.view.MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.action_edit_patient) {
            Intent intent = new Intent(this, EditPatientActivity.class);
            intent.putExtra("PATIENT_ID", patientId);
            startActivityForResult(intent, 600);
            return true;
        } else if (id == R.id.action_delete_patient) {
            confirmDeletePatient();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void confirmDeletePatient() {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String role = prefs.getString("user_role", "");

        if (!"SENIOR".equals(role)) {
            Toast.makeText(this, "Only seniors can delete patients", Toast.LENGTH_SHORT).show();
            return;
        }

        new AlertDialog.Builder(this)
                .setTitle("Delete Patient")
                .setMessage("Are you sure you want to delete this patient? This action cannot be undone.")
                .setPositiveButton("Delete", (dialog, which) -> deletePatient())
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void deletePatient() {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        progressBar.setVisibility(View.VISIBLE);
        ApiClient.delete("/patients/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(PatientDetailsActivity.this, "Patient deleted", Toast.LENGTH_SHORT).show();
                    setResult(RESULT_OK);
                    finish();
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(PatientDetailsActivity.this, "Deletion failed: " + error.getMessage(),
                            Toast.LENGTH_LONG).show();
                });
            }
        });
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 600 && resultCode == RESULT_OK) {
            loadPatientData();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        reminderHandler.removeCallbacks(reminderPoller);
    }

    private void setupViewPager() {
        PatientPagerAdapter pagerAdapter = new PatientPagerAdapter(this, patientId);
        viewPager.setAdapter(pagerAdapter);

        new TabLayoutMediator(tabLayout, viewPager, (tab, position) -> {
            switch (position) {
                case 0:
                    tab.setText("Overview");
                    break;
                case 1:
                    tab.setText("Handover");
                    break;
                case 2:
                    tab.setText("Vitals");
                    break;
                case 3:
                    tab.setText("MAR");
                    break;
                case 4:
                    tab.setText("I/O");
                    break;
                case 5:
                    tab.setText("Labs");
                    break;
                case 6:
                    tab.setText("Radiology");
                    break;
                case 7:
                    tab.setText("Cardiology");
                    break;
                case 8:
                    tab.setText("Interventions");
                    break;
                case 9:
                    tab.setText("Notes");
                    break;
                case 10:
                    tab.setText("Ventilator");
                    break;
                case 11:
                    tab.setText("Orders");
                    break;
            }
        }).attach();
    }

    private void loadPatientData() {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        progressBar.setVisibility(View.VISIBLE);
        ApiClient.get("/patients/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    try {
                        JSONObject patient = new JSONObject(responseStr);
                        String name = patient.optString("name", "Unknown");
                        String mrn = patient.optString("mrn", "--");
                        String bed = patient.optString("bedNumber", "--");
                        String age = patient.optString("age", "");
                        String gender = patient.optString("gender", "U");

                        textDetailName.setText(name);
                        textDetailInfo.setText("MRN: " + mrn + " | Bed: " + bed + " | " + age
                                + (gender.length() > 0 ? gender.substring(0, 1).toUpperCase() : ""));
                    } catch (JSONException e) {
                        e.printStackTrace();
                        Toast.makeText(PatientDetailsActivity.this, "Failed to parse patient", Toast.LENGTH_SHORT)
                                .show();
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(PatientDetailsActivity.this, "Network error: " + error.getMessage(),
                            Toast.LENGTH_SHORT).show();
                });
            }
        });
    }

    private void fetchDueReminders() {
        if (bannerDismissed)
            return;

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/orders/due-reminders", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                runOnUiThread(() -> {
                    try {
                        JSONArray allReminders = new JSONArray(responseStr);
                        for (int i = 0; i < allReminders.length(); i++) {
                            JSONObject order = allReminders.getJSONObject(i);
                            if (patientId.equals(order.optString("patientId"))) {
                                currentOrderId = order.optString("id");
                                JSONObject details = order.optJSONObject("details");
                                String notifText = (details != null && details.has("notificationText"))
                                        ? details.optString("notificationText")
                                        : order.optString("title");
                                textBannerTitle.setText("Due: " + notifText);
                                bannerReminder.setVisibility(View.VISIBLE);
                                return;
                            }
                        }
                        bannerReminder.setVisibility(View.GONE);
                        currentOrderId = null;
                    } catch (Exception ignored) {
                    }
                });
            }

            @Override
            public void onError(Exception error) {
            }
        });
    }

    private void showCompleteDialog() {
        new AlertDialog.Builder(this)
                .setTitle("Complete Check")
                .setMessage("Are you sure you want to mark this intervention check as completed?")
                .setPositiveButton("Complete", (dialog, which) -> markOrderCompleted())
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void markOrderCompleted() {
        if (currentOrderId == null)
            return;

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        progressBar.setVisibility(View.VISIBLE);
        try {
            JSONObject body = new JSONObject();
            body.put("status", "COMPLETED");
            body.put("userId", userId);

            ApiClient.patch("/orders/" + currentOrderId + "/status", body.toString(), token,
                    new ApiClient.ApiCallback() {
                        @Override
                        public void onSuccess(String response) {
                            runOnUiThread(() -> {
                                progressBar.setVisibility(View.GONE);
                                bannerReminder.setVisibility(View.GONE);
                                bannerDismissed = true;
                                Toast.makeText(PatientDetailsActivity.this, "Check completed", Toast.LENGTH_SHORT)
                                        .show();
                            });
                        }

                        @Override
                        public void onError(Exception error) {
                            runOnUiThread(() -> {
                                progressBar.setVisibility(View.GONE);
                                Toast.makeText(PatientDetailsActivity.this, "Failed to complete check",
                                        Toast.LENGTH_SHORT).show();
                            });
                        }
                    });
        } catch (JSONException e) {
            progressBar.setVisibility(View.GONE);
        }
    }
}
