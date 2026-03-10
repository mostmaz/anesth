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

public class AddVentilatorActivity extends AppCompatActivity {

    private String patientId;

    private EditText editMode;
    private EditText editRate;
    private EditText editFio2;
    private EditText editIe;
    private EditText editVt;
    private EditText editPs;

    private Button btnSubmitVentilator;
    private ProgressBar progressSubmit;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_ventilator);

        patientId = getIntent().getStringExtra("patient_id");
        if (patientId == null) {
            Toast.makeText(this, "Missing patient ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbarAddVentilator);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        editMode = findViewById(R.id.editMode);
        editRate = findViewById(R.id.editRate);
        editFio2 = findViewById(R.id.editFio2);
        editIe = findViewById(R.id.editIe);
        editVt = findViewById(R.id.editVt);
        editPs = findViewById(R.id.editPs);

        btnSubmitVentilator = findViewById(R.id.btnSubmitVentilator);
        progressSubmit = findViewById(R.id.progressSubmit);

        btnSubmitVentilator.setOnClickListener(v -> submitVentilatorSettings());
    }

    private void submitVentilatorSettings() {
        String mode = editMode.getText().toString().trim();
        String rate = editRate.getText().toString().trim();
        String fio2 = editFio2.getText().toString().trim();
        String ie = editIe.getText().toString().trim();
        String vt = editVt.getText().toString().trim();
        String ps = editPs.getText().toString().trim();

        if (mode.isEmpty() || rate.isEmpty() || fio2.isEmpty() || ie.isEmpty() || vt.isEmpty() || ps.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        progressSubmit.setVisibility(View.VISIBLE);
        btnSubmitVentilator.setEnabled(false);

        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("userId", userId);
            body.put("mode", mode);
            body.put("ie", ie);

            // Note: If using recent web changes to timestamp, we may want to include
            // "timestamp" here.
            // But the server has a @default(now()) on timestamp so it's fine without it for
            // real-time entry.
            body.put("rate", Integer.parseInt(rate));
            body.put("fio2", Integer.parseInt(fio2));
            body.put("vt", Integer.parseInt(vt));
            body.put("ps", Integer.parseInt(ps));

            ApiClient.post("/ventilator", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        progressSubmit.setVisibility(View.GONE);
                        btnSubmitVentilator.setEnabled(true);
                        Toast.makeText(AddVentilatorActivity.this, "Settings recorded successfully", Toast.LENGTH_SHORT)
                                .show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progressSubmit.setVisibility(View.GONE);
                        btnSubmitVentilator.setEnabled(true);
                        Toast.makeText(AddVentilatorActivity.this, "Failed to record settings: " + error.getMessage(),
                                Toast.LENGTH_LONG).show();
                    });
                }
            });

        } catch (JSONException | NumberFormatException e) {
            progressSubmit.setVisibility(View.GONE);
            btnSubmitVentilator.setEnabled(true);
            Toast.makeText(this, "Invalid number format", Toast.LENGTH_SHORT).show();
        }
    }
}
