package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONException;
import org.json.JSONObject;

public class CreateOrderActivity extends AppCompatActivity {

    private String patientId;

    private EditText editTitle;
    private Spinner spinnerType;
    private Spinner spinnerPriority;
    private EditText editDetails;
    private EditText editNotes;

    private Button btnSubmitOrder;
    private ProgressBar progressSubmit;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_create_order);

        patientId = getIntent().getStringExtra("patient_id");
        if (patientId == null) {
            Toast.makeText(this, "Missing patient ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        Toolbar toolbar = findViewById(R.id.toolbarCreateOrder);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
            getSupportActionBar().setDisplayShowHomeEnabled(true);
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        editTitle = findViewById(R.id.editOrderTitle);
        spinnerType = findViewById(R.id.spinnerOrderType);
        spinnerPriority = findViewById(R.id.spinnerOrderPriority);
        editDetails = findViewById(R.id.editOrderDetails);
        editNotes = findViewById(R.id.editOrderNotes);

        btnSubmitOrder = findViewById(R.id.btnSubmitOrder);
        progressSubmit = findViewById(R.id.progressSubmit);

        // Setup Spinners
        String[] types = new String[] { "MEDICATION", "LAB", "IMAGING", "PROTOCOL", "NURSING", "DIET", "CONSULT",
                "BLOOD_PRODUCT" };
        ArrayAdapter<String> typeAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item,
                types);
        typeAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerType.setAdapter(typeAdapter);

        String[] priorities = new String[] { "ROUTINE", "URGENT", "STAT" };
        ArrayAdapter<String> priorityAdapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item,
                priorities);
        priorityAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerPriority.setAdapter(priorityAdapter);

        btnSubmitOrder.setOnClickListener(v -> submitOrder());
    }

    private void submitOrder() {
        String title = editTitle.getText().toString().trim();
        if (title.isEmpty()) {
            Toast.makeText(this, "Order title is required", Toast.LENGTH_SHORT).show();
            return;
        }

        String type = spinnerType.getSelectedItem().toString();
        String priority = spinnerPriority.getSelectedItem().toString();
        String details = editDetails.getText().toString().trim();
        String notes = editNotes.getText().toString().trim();

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        progressSubmit.setVisibility(View.VISIBLE);
        btnSubmitOrder.setEnabled(false);

        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("authorId", userId);
            body.put("title", title);
            body.put("type", type);
            body.put("priority", priority);

            if (!details.isEmpty()) {
                JSONObject detailsJson = new JSONObject();
                detailsJson.put("info", details);
                body.put("details", detailsJson);
            }

            if (!notes.isEmpty()) {
                body.put("notes", notes);
            }

            ApiClient.post("/orders", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        progressSubmit.setVisibility(View.GONE);
                        btnSubmitOrder.setEnabled(true);
                        Toast.makeText(CreateOrderActivity.this, "Order created successfully", Toast.LENGTH_SHORT)
                                .show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progressSubmit.setVisibility(View.GONE);
                        btnSubmitOrder.setEnabled(true);
                        Toast.makeText(CreateOrderActivity.this, "Failed to create order", Toast.LENGTH_LONG).show();
                    });
                }
            });

        } catch (JSONException e) {
            progressSubmit.setVisibility(View.GONE);
            btnSubmitOrder.setEnabled(true);
            Toast.makeText(this, "Error building request", Toast.LENGTH_SHORT).show();
        }
    }
}
