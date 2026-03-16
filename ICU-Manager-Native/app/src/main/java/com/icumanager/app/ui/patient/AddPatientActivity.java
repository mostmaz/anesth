package com.icumanager.app.ui.patient;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.MenuItem;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.Spinner;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONObject;

public class AddPatientActivity extends AppCompatActivity {

    private EditText editName, editMrn, editAge, editBedNumber,
                     editDiagnosis, editComorbidities, editAdmittingDoctor;
    private Spinner spinnerGender;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_patient);

        Toolbar toolbar = findViewById(R.id.toolbar);
        setSupportActionBar(toolbar);
        if (getSupportActionBar() != null) {
            getSupportActionBar().setDisplayHomeAsUpEnabled(true);
        }

        editName            = findViewById(R.id.editName);
        editMrn             = findViewById(R.id.editMrn);
        editAge             = findViewById(R.id.editAge);
        editBedNumber       = findViewById(R.id.editBedNumber);
        editDiagnosis       = findViewById(R.id.editDiagnosis);
        editComorbidities   = findViewById(R.id.editComorbidities);
        editAdmittingDoctor = findViewById(R.id.editAdmittingDoctor);
        spinnerGender       = findViewById(R.id.spinnerGender);

        ArrayAdapter<String> genderAdapter = new ArrayAdapter<>(
                this,
                android.R.layout.simple_spinner_item,
                new String[]{"MALE", "FEMALE", "OTHER"});
        genderAdapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerGender.setAdapter(genderAdapter);

        Button btnSave = findViewById(R.id.btnSave);
        btnSave.setOnClickListener(v -> submitPatient());
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == android.R.id.home) {
            finish();
            return true;
        }
        return super.onOptionsItemSelected(item);
    }

    private void submitPatient() {
        String name   = editName.getText().toString().trim();
        String mrn    = editMrn.getText().toString().trim();
        String ageStr = editAge.getText().toString().trim();
        String bed    = editBedNumber.getText().toString().trim();
        String dx     = editDiagnosis.getText().toString().trim();
        String comor  = editComorbidities.getText().toString().trim();
        String doctor = editAdmittingDoctor.getText().toString().trim();
        String gender = spinnerGender.getSelectedItem().toString();

        if (name.isEmpty()) {
            Toast.makeText(this, "Patient name is required", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        try {
            JSONObject body = new JSONObject();
            body.put("name", name);
            if (!mrn.isEmpty())    body.put("mrn", mrn);
            if (!ageStr.isEmpty()) body.put("age", Integer.parseInt(ageStr));
            if (!bed.isEmpty())    body.put("bedNumber", bed);
            if (!dx.isEmpty())     body.put("diagnosis", dx);
            if (!comor.isEmpty())  body.put("comorbidities", comor);
            if (!doctor.isEmpty()) body.put("admittingDoctor", doctor);
            body.put("gender", gender);
            body.put("status", "ADMITTED");

            ApiClient.post("/patients", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    runOnUiThread(() -> {
                        Toast.makeText(AddPatientActivity.this, "Patient admitted successfully", Toast.LENGTH_SHORT).show();
                        setResult(Activity.RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() ->
                        Toast.makeText(AddPatientActivity.this,
                                "Failed to admit patient: " + error.getMessage(), Toast.LENGTH_LONG).show()
                    );
                }
            });
        } catch (Exception e) {
            Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }
}
