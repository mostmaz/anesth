package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.google.android.material.textfield.TextInputEditText;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONException;
import org.json.JSONObject;

public class EditPatientActivity extends AppCompatActivity {

    private String patientId;

    private TextInputEditText editName;
    private TextInputEditText editMrn;
    private TextInputEditText editAge;
    private TextInputEditText editBed;
    private TextInputEditText editDiagnosis;
    private TextInputEditText editComorbidities;
    private Spinner spinnerGender;
    private Button btnSave;
    private ProgressBar progress;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_edit_patient);

        patientId = getIntent().getStringExtra("PATIENT_ID");
        if (patientId == null) {
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbarEditPatient);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        editName = findViewById(R.id.editPatientName);
        editMrn = findViewById(R.id.editPatientMrn);
        editAge = findViewById(R.id.editPatientAge);
        editBed = findViewById(R.id.editPatientBed);
        editDiagnosis = findViewById(R.id.editPatientDiagnosis);
        editComorbidities = findViewById(R.id.editPatientComorbidities);
        spinnerGender = findViewById(R.id.spinnerGender);
        btnSave = findViewById(R.id.btnSavePatient);
        progress = findViewById(R.id.progressEditPatient);

        ArrayAdapter<String> genderAdapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, new String[] { "Male", "Female", "Other" });
        genderAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerGender.setAdapter(genderAdapter);

        loadPatientData();

        btnSave.setOnClickListener(v -> savePatientData());
    }

    private void loadPatientData() {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        progress.setVisibility(View.VISIBLE);
        ApiClient.get("/patients/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                runOnUiThread(() -> {
                    progress.setVisibility(View.GONE);
                    try {
                        JSONObject p = new JSONObject(response);
                        editName.setText(p.optString("name"));
                        editMrn.setText(p.optString("mrn"));
                        editAge.setText(p.optString("age"));
                        editBed.setText(p.optString("bedNumber"));
                        editDiagnosis.setText(p.optString("mainDiagnosis"));
                        editComorbidities.setText(p.optString("comorbidities"));

                        String gender = p.optString("gender", "Male");
                        if ("Female".equalsIgnoreCase(gender))
                            spinnerGender.setSelection(1);
                        else if ("Other".equalsIgnoreCase(gender))
                            spinnerGender.setSelection(2);
                        else
                            spinnerGender.setSelection(0);

                    } catch (JSONException e) {
                        e.printStackTrace();
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                runOnUiThread(() -> progress.setVisibility(View.GONE));
            }
        });
    }

    private void savePatientData() {
        String name = editName.getText().toString().trim();
        String mrn = editMrn.getText().toString().trim();
        String age = editAge.getText().toString().trim();
        String bed = editBed.getText().toString().trim();
        String diagnosis = editDiagnosis.getText().toString().trim();
        String comorbidities = editComorbidities.getText().toString().trim();
        String gender = spinnerGender.getSelectedItem().toString();

        if (name.isEmpty() || mrn.isEmpty()) {
            Toast.makeText(this, "Name and MRN are required", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        progress.setVisibility(View.VISIBLE);
        try {
            JSONObject body = new JSONObject();
            body.put("name", name);
            body.put("mrn", mrn);
            body.put("age", age);
            body.put("gender", gender);
            body.put("bedNumber", bed);
            body.put("mainDiagnosis", diagnosis);
            body.put("comorbidities", comorbidities);

            ApiClient.patch("/patients/" + patientId, body.toString(), token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        progress.setVisibility(View.GONE);
                        Toast.makeText(EditPatientActivity.this, "Patient updated", Toast.LENGTH_SHORT).show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progress.setVisibility(View.GONE);
                        Toast.makeText(EditPatientActivity.this, "Update failed: " + error.getMessage(),
                                Toast.LENGTH_LONG).show();
                    });
                }
            });
        } catch (JSONException e) {
            progress.setVisibility(View.GONE);
        }
    }
}
