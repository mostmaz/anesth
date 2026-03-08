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

public class UpdateHandoverActivity extends AppCompatActivity {

    private String patientId;
    private EditText editHandoverNotes;
    private Button btnSubmitHandover;
    private ProgressBar progressSubmitHandover;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_update_handover);

        patientId = getIntent().getStringExtra("patient_id");
        if (patientId == null) {
            Toast.makeText(this, "Missing patient ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbarHandover);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        editHandoverNotes = findViewById(R.id.editHandoverNotes);
        btnSubmitHandover = findViewById(R.id.btnSubmitHandover);
        progressSubmitHandover = findViewById(R.id.progressSubmitHandover);

        btnSubmitHandover.setOnClickListener(v -> submitNotes());
    }

    private void submitNotes() {
        String notes = editHandoverNotes.getText().toString().trim();
        if (notes.isEmpty()) {
            Toast.makeText(this, "Please enter notes", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        progressSubmitHandover.setVisibility(View.VISIBLE);
        btnSubmitHandover.setEnabled(false);

        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("userId", userId);
            body.put("notes", notes);

            // By default mark active (this matches the backend logic for new handovers)
            body.put("isActive", true);

            ApiClient.post("/specialist", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        progressSubmitHandover.setVisibility(View.GONE);
                        btnSubmitHandover.setEnabled(true);
                        Toast.makeText(UpdateHandoverActivity.this, "Specialist notes saved", Toast.LENGTH_SHORT)
                                .show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progressSubmitHandover.setVisibility(View.GONE);
                        btnSubmitHandover.setEnabled(true);
                        Toast.makeText(UpdateHandoverActivity.this, "Failed to save: " + error.getMessage(),
                                Toast.LENGTH_LONG).show();
                    });
                }
            });
        } catch (JSONException e) {
            progressSubmitHandover.setVisibility(View.GONE);
            btnSubmitHandover.setEnabled(true);
            Toast.makeText(this, "JSON Error", Toast.LENGTH_SHORT).show();
        }
    }
}
