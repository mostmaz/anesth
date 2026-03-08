package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.RadioButton;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONException;
import org.json.JSONObject;

public class AddIoActivity extends AppCompatActivity {

    private String patientId;

    private RadioButton radioInput;
    private EditText editAmount;
    private EditText editFluidType;
    private Button btnSubmitIo;
    private ProgressBar progressSubmitIo;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_io);

        patientId = getIntent().getStringExtra("patient_id");
        if (patientId == null) {
            Toast.makeText(this, "Missing patient ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbarAddIo);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        radioInput = findViewById(R.id.radioInput);
        editAmount = findViewById(R.id.editAmount);
        editFluidType = findViewById(R.id.editFluidType);
        btnSubmitIo = findViewById(R.id.btnSubmitIo);
        progressSubmitIo = findViewById(R.id.progressSubmitIo);

        btnSubmitIo.setOnClickListener(v -> submitIo());
    }

    private void submitIo() {
        String amountStr = editAmount.getText().toString().trim();
        String fluidType = editFluidType.getText().toString().trim();

        if (amountStr.isEmpty() || fluidType.isEmpty()) {
            Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show();
            return;
        }

        int amount = Integer.parseInt(amountStr);
        String type = radioInput.isChecked() ? "INPUT" : "OUTPUT";

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        progressSubmitIo.setVisibility(View.VISIBLE);
        btnSubmitIo.setEnabled(false);

        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("userId", userId);
            body.put("type", type);
            body.put("amount", amount);
            body.put("fluidType", fluidType);

            ApiClient.post("/io", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        progressSubmitIo.setVisibility(View.GONE);
                        btnSubmitIo.setEnabled(true);
                        Toast.makeText(AddIoActivity.this, "I/O record saved", Toast.LENGTH_SHORT).show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progressSubmitIo.setVisibility(View.GONE);
                        btnSubmitIo.setEnabled(true);
                        Toast.makeText(AddIoActivity.this, "Failed to save: " + error.getMessage(), Toast.LENGTH_LONG)
                                .show();
                    });
                }
            });
        } catch (JSONException e) {
            progressSubmitIo.setVisibility(View.GONE);
            btnSubmitIo.setEnabled(true);
            Toast.makeText(this, "JSON Error", Toast.LENGTH_SHORT).show();
        }
    }
}
