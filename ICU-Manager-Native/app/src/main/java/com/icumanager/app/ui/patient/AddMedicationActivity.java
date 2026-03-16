package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.google.android.material.textfield.TextInputEditText;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONException;
import org.json.JSONObject;

public class AddMedicationActivity extends AppCompatActivity {

    private String patientId;

    private android.widget.AutoCompleteTextView editMedName;
    private TextInputEditText editMedDose;
    private android.widget.AutoCompleteTextView editMedRoute;
    private android.widget.AutoCompleteTextView editMedFrequency;
    private TextInputEditText editMedInfusionRate;
    private TextInputEditText editMedDilution;
    private TextInputEditText editMedReminder;
    private TextInputEditText editMedInstructions;

    private Button btnSubmitMed;
    private ProgressBar progressSubmitMed;

    private android.widget.ArrayAdapter<String> drugAdapter;
    private java.util.List<String> drugNames = new java.util.ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_medication);

        patientId = getIntent().getStringExtra("patient_id");
        if (patientId == null) {
            Toast.makeText(this, "Missing patient ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbarAddMed);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        editMedName = findViewById(R.id.editMedName);
        editMedDose = findViewById(R.id.editMedDose);
        editMedRoute = findViewById(R.id.editMedRoute);
        editMedFrequency = findViewById(R.id.editMedFrequency);
        editMedInfusionRate = findViewById(R.id.editMedInfusionRate);
        editMedDilution = findViewById(R.id.editMedDilution);
        editMedReminder = findViewById(R.id.editMedReminder);
        editMedInstructions = findViewById(R.id.editMedInstructions);

        btnSubmitMed = findViewById(R.id.btnSubmitMed);
        progressSubmitMed = findViewById(R.id.progressSubmitMed);

        setupDrugAutocomplete();
        setupRouteAndFrequencyDropdowns();
        btnSubmitMed.setOnClickListener(v -> submitMedication());
    }

    private void setupRouteAndFrequencyDropdowns() {
        String[] routes = { "PO", "IV", "IM", "SC", "PR", "SL", "Topical", "Inhalation", "NG", "PEG", "Intrathecal",
                "Intraventricular" };
        android.widget.ArrayAdapter<String> routeAdapter = new android.widget.ArrayAdapter<>(this,
                android.R.layout.simple_dropdown_item_1line, routes);
        editMedRoute.setAdapter(routeAdapter);

        String[] frequencies = { "Once Only", "Stat", "PRN", "Daily", "BID", "TID", "QID", "Q4H", "Q6H", "Q8H", "Q12H",
                "Q24H", "Weekly", "Monthly" };
        android.widget.ArrayAdapter<String> frequencyAdapter = new android.widget.ArrayAdapter<>(this,
                android.R.layout.simple_dropdown_item_1line, frequencies);
        editMedFrequency.setAdapter(frequencyAdapter);
    }

    private void setupDrugAutocomplete() {
        drugAdapter = new android.widget.ArrayAdapter<>(this, android.R.layout.simple_dropdown_item_1line, drugNames);
        editMedName.setAdapter(drugAdapter);

        editMedName.addTextChangedListener(new android.text.TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                if (s.length() >= 1) {
                    searchDrugs(s.toString());
                }
            }

            @Override
            public void afterTextChanged(android.text.Editable s) {
            }
        });
    }

    private void searchDrugs(String query) {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/medications/catalog?q=" + query, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    org.json.JSONArray results = new org.json.JSONArray(response);
                    drugNames.clear();
                    for (int i = 0; i < results.length(); i++) {
                        drugNames.add(results.getJSONObject(i).getString("name"));
                    }
                    runOnUiThread(() -> drugAdapter.notifyDataSetChanged());
                } catch (org.json.JSONException ignored) {
                }
            }

            @Override
            public void onError(Exception error) {
            }
        });
    }

    private void submitMedication() {
        String name = editMedName.getText() != null ? editMedName.getText().toString().trim() : "";
        String dose = editMedDose.getText() != null ? editMedDose.getText().toString().trim() : "";
        String route = editMedRoute.getText() != null ? editMedRoute.getText().toString().trim() : "";
        String freq = editMedFrequency.getText() != null ? editMedFrequency.getText().toString().trim() : "";
        String infusion = editMedInfusionRate.getText() != null ? editMedInfusionRate.getText().toString().trim() : "";
        String dilution = editMedDilution.getText() != null ? editMedDilution.getText().toString().trim() : "";
        String reminder = editMedReminder.getText() != null ? editMedReminder.getText().toString().trim() : "";
        String inst = editMedInstructions.getText() != null ? editMedInstructions.getText().toString().trim() : "";

        if (name.isEmpty() || dose.isEmpty() || route.isEmpty()) {
            Toast.makeText(this, "Name, Dose, and Route are required", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        progressSubmitMed.setVisibility(View.VISIBLE);
        btnSubmitMed.setEnabled(false);

        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("name", name);
            body.put("dose", dose);
            body.put("route", route);
            if (!freq.isEmpty())
                body.put("frequency", freq);
            if (!infusion.isEmpty())
                body.put("infusionRate", infusion);
            if (!dilution.isEmpty())
                body.put("dilution", Double.parseDouble(dilution));
            if (!reminder.isEmpty())
                body.put("durationReminder", Integer.parseInt(reminder));
            if (!inst.isEmpty())
                body.put("otherInstructions", inst);

            body.put("startedAt", new java.util.Date().toInstant().toString());

            ApiClient.post("/medications/prescribe", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        progressSubmitMed.setVisibility(View.GONE);
                        btnSubmitMed.setEnabled(true);
                        Toast.makeText(AddMedicationActivity.this, "Medication prescribed", Toast.LENGTH_SHORT).show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progressSubmitMed.setVisibility(View.GONE);
                        btnSubmitMed.setEnabled(true);
                        Toast.makeText(AddMedicationActivity.this, "Failed to prescribe: " + error.getMessage(),
                                Toast.LENGTH_LONG).show();
                    });
                }
            });
        } catch (JSONException e) {
            progressSubmitMed.setVisibility(View.GONE);
            btnSubmitMed.setEnabled(true);
            Toast.makeText(this, "JSON Error", Toast.LENGTH_SHORT).show();
        }
    }
}
