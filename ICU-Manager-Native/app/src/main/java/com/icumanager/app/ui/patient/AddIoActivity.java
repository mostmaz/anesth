package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONException;
import org.json.JSONObject;

public class AddIoActivity extends AppCompatActivity {

    private static final String[] INPUT_CATEGORIES = {
            "IV Fluids", "Oral / PO", "NG Feed", "Blood / Blood Products",
            "Medications / Infusions", "TPN", "Other Input"
    };

    private static final String[] OUTPUT_CATEGORIES = {
            "Urine", "Nasogastric (NG) Drain", "Chest Drain",
            "Wound Drain", "Emesis / Vomit", "Stool", "Insensible Loss", "Other Output"
    };

    private String patientId;

    private RadioGroup radioGroupType;
    private RadioButton radioInput;
    private Spinner spinnerCategory;
    private EditText editFluidType;
    private EditText editAmount;
    private EditText editRate;
    private EditText editIoNotes;
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

        radioGroupType = findViewById(R.id.radioGroupType);
        radioInput = findViewById(R.id.radioInput);
        spinnerCategory = findViewById(R.id.spinnerCategory);
        editFluidType = findViewById(R.id.editFluidType);
        editAmount = findViewById(R.id.editAmount);
        editRate = findViewById(R.id.editRate);
        editIoNotes = findViewById(R.id.editIoNotes);
        btnSubmitIo = findViewById(R.id.btnSubmitIo);
        progressSubmitIo = findViewById(R.id.progressSubmitIo);

        // Populate initial categories (Input selected by default)
        setCategoryOptions(true);

        radioGroupType.setOnCheckedChangeListener((group, checkedId) -> {
            setCategoryOptions(checkedId == R.id.radioInput);
        });

        btnSubmitIo.setOnClickListener(v -> submitIo());
    }

    private void setCategoryOptions(boolean isInput) {
        String[] options = isInput ? INPUT_CATEGORIES : OUTPUT_CATEGORIES;
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this,
                android.R.layout.simple_spinner_item, options);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerCategory.setAdapter(adapter);
    }

    private void submitIo() {
        String amountStr = editAmount.getText().toString().trim();
        String fluidType = editFluidType.getText().toString().trim();

        if (amountStr.isEmpty()) {
            Toast.makeText(this, "Please enter the amount", Toast.LENGTH_SHORT).show();
            return;
        }
        if (fluidType.isEmpty()) {
            Toast.makeText(this, "Please enter fluid / source", Toast.LENGTH_SHORT).show();
            return;
        }

        int amount;
        try {
            amount = Integer.parseInt(amountStr);
        } catch (NumberFormatException e) {
            Toast.makeText(this, "Invalid amount", Toast.LENGTH_SHORT).show();
            return;
        }

        String type = radioInput.isChecked() ? "INPUT" : "OUTPUT";
        String category = spinnerCategory.getSelectedItem() != null
                ? spinnerCategory.getSelectedItem().toString() : "";
        String rateStr = editRate.getText().toString().trim();
        String notes = editIoNotes.getText().toString().trim();

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
            body.put("category", category);
            body.put("amount", amount);
            body.put("fluidType", fluidType);
            if (!rateStr.isEmpty()) {
                body.put("rate", Double.parseDouble(rateStr));
            }
            if (!notes.isEmpty()) {
                body.put("notes", notes);
            }

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
                        Toast.makeText(AddIoActivity.this, "Failed to save: " + error.getMessage(),
                                Toast.LENGTH_LONG).show();
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
