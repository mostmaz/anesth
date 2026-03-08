package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONException;
import org.json.JSONObject;

public class AddVitalsActivity extends AppCompatActivity {

    private String patientId;

    private EditText editTemp;
    private EditText editSys;
    private EditText editDia;
    private EditText editHR;
    private EditText editRR;
    private EditText editSpO2;
    private EditText editRBS;

    private Button btnSubmitVitals;
    private ProgressBar progressSubmit;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_vitals);

        patientId = getIntent().getStringExtra("patient_id");
        if (patientId == null) {
            Toast.makeText(this, "Missing patient ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbarAddVitals);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        editTemp = findViewById(R.id.editTemp);
        editSys = findViewById(R.id.editSys);
        editDia = findViewById(R.id.editDia);
        editHR = findViewById(R.id.editHR);
        editRR = findViewById(R.id.editRR);
        editSpO2 = findViewById(R.id.editSpO2);
        editRBS = findViewById(R.id.editRBS);

        btnSubmitVitals = findViewById(R.id.btnSubmitVitals);
        progressSubmit = findViewById(R.id.progressSubmit);

        btnSubmitVitals.setOnClickListener(v -> submitVitals());
    }

    private void submitVitals() {
        String temp = editTemp.getText().toString().trim();
        String sys = editSys.getText().toString().trim();
        String dia = editDia.getText().toString().trim();
        String hr = editHR.getText().toString().trim();
        String rr = editRR.getText().toString().trim();
        String spo2 = editSpO2.getText().toString().trim();
        String rbs = editRBS.getText().toString().trim();

        // Basic validation: at least one field must be filled
        if (temp.isEmpty() && sys.isEmpty() && dia.isEmpty() && hr.isEmpty()
                && rr.isEmpty() && spo2.isEmpty() && rbs.isEmpty()) {
            Toast.makeText(this, "Please enter at least one vital sign", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        progressSubmit.setVisibility(View.VISIBLE);
        btnSubmitVitals.setEnabled(false);

        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("userId", userId);

            if (!temp.isEmpty())
                body.put("temperature", Double.parseDouble(temp));
            if (!hr.isEmpty())
                body.put("heartRate", Integer.parseInt(hr));
            if (!rr.isEmpty())
                body.put("respiratoryRate", Integer.parseInt(rr));
            if (!spo2.isEmpty())
                body.put("oxygenSaturation", Integer.parseInt(spo2));
            if (!rbs.isEmpty())
                body.put("rbs", Double.parseDouble(rbs));

            if (!sys.isEmpty() && !dia.isEmpty()) {
                body.put("bloodPressure", sys + "/" + dia);
            }

            ApiClient.post("/vitals", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        progressSubmit.setVisibility(View.GONE);
                        btnSubmitVitals.setEnabled(true);
                        Toast.makeText(AddVitalsActivity.this, "Vitals saved successfully", Toast.LENGTH_SHORT).show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progressSubmit.setVisibility(View.GONE);
                        btnSubmitVitals.setEnabled(true);
                        Toast.makeText(AddVitalsActivity.this, "Failed to save vitals: " + error.getMessage(),
                                Toast.LENGTH_LONG).show();
                    });
                }
            });

        } catch (JSONException | NumberFormatException e) {
            progressSubmit.setVisibility(View.GONE);
            btnSubmitVitals.setEnabled(true);
            Toast.makeText(this, "Invalid number format", Toast.LENGTH_SHORT).show();
        }
    }
}
