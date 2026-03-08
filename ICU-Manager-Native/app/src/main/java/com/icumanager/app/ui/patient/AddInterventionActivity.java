package com.icumanager.app.ui.patient;

import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

public class AddInterventionActivity extends AppCompatActivity {

    private String patientId;

    private Spinner spinnerType;
    private EditText editProcedureName;
    private TextView labelProcedureName;
    private Button btnTimeDone;
    private EditText editNotes;
    private EditText editNotificationText;
    private Button btnCheckReminder;
    private Button btnSchedule;
    private Button btnCancel;
    private ProgressBar progressBar;

    private Calendar timeDoneCalendar = Calendar.getInstance();
    private Calendar reminderCalendar = null; // null means no reminder

    private final SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
    private final SimpleDateFormat displayFormat = new SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.US);

    private final String[] INTERVENTION_TYPES = {
            "ETT", "Tracheostomy", "Arterial Line", "CV Line", "Hickman", "Surgery", "Other"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_add_intervention);

        patientId = getIntent().getStringExtra("patient_id");
        if (patientId == null) {
            Toast.makeText(this, "Missing patient ID", Toast.LENGTH_SHORT).show();
            finish();
            return;
        }

        spinnerType = findViewById(R.id.spinnerType);
        editProcedureName = findViewById(R.id.editProcedureName);
        labelProcedureName = findViewById(R.id.labelProcedureName);
        btnTimeDone = findViewById(R.id.btnTimeDone);
        editNotes = findViewById(R.id.editNotes);
        editNotificationText = findViewById(R.id.editNotificationText);
        btnCheckReminder = findViewById(R.id.btnCheckReminder);
        btnSchedule = findViewById(R.id.btnSchedule);
        btnCancel = findViewById(R.id.btnCancel);
        progressBar = findViewById(R.id.progressBar);

        // Setup Spinner
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item,
                INTERVENTION_TYPES);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerType.setAdapter(adapter);

        spinnerType.setOnItemSelectedListener(new AdapterView.OnItemSelectedListener() {
            @Override
            public void onItemSelected(AdapterView<?> parent, View view, int position, long id) {
                String type = INTERVENTION_TYPES[position];
                if ("Surgery".equals(type) || "Other".equals(type)) {
                    labelProcedureName.setVisibility(View.VISIBLE);
                    editProcedureName.setVisibility(View.VISIBLE);
                } else {
                    labelProcedureName.setVisibility(View.GONE);
                    editProcedureName.setVisibility(View.GONE);
                }

                // Auto-suggest reminder
                int hours = 24;
                if ("Tracheostomy".equals(type) || "Hickman".equals(type))
                    hours = 168; // 7 days
                else if ("Arterial Line".equals(type) || "CV Line".equals(type))
                    hours = 72;

                reminderCalendar = Calendar.getInstance();
                reminderCalendar.add(Calendar.HOUR_OF_DAY, hours);
                btnCheckReminder.setText("Check: " + displayFormat.format(reminderCalendar.getTime()));
            }

            @Override
            public void onNothingSelected(AdapterView<?> parent) {
            }
        });

        btnTimeDone.setText("Done: " + displayFormat.format(timeDoneCalendar.getTime()));
        btnTimeDone.setOnClickListener(v -> showDateTimePicker(timeDoneCalendar, btnTimeDone, "Done: "));

        btnCheckReminder.setOnClickListener(v -> {
            if (reminderCalendar == null)
                reminderCalendar = Calendar.getInstance();
            showDateTimePicker(reminderCalendar, btnCheckReminder, "Check: ");
        });

        btnCancel.setOnClickListener(v -> finish());
        btnSchedule.setOnClickListener(v -> submitIntervention());
    }

    private void showDateTimePicker(Calendar calendar, Button targetButton, String prefix) {
        new DatePickerDialog(this, (view, year, month, dayOfMonth) -> {
            calendar.set(Calendar.YEAR, year);
            calendar.set(Calendar.MONTH, month);
            calendar.set(Calendar.DAY_OF_MONTH, dayOfMonth);

            new TimePickerDialog(this, (timeView, hourOfDay, minute) -> {
                calendar.set(Calendar.HOUR_OF_DAY, hourOfDay);
                calendar.set(Calendar.MINUTE, minute);
                targetButton.setText(prefix + displayFormat.format(calendar.getTime()));
            }, calendar.get(Calendar.HOUR_OF_DAY), calendar.get(Calendar.MINUTE), true).show();

        }, calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH), calendar.get(Calendar.DAY_OF_MONTH)).show();
    }

    private void submitIntervention() {
        String type = (String) spinnerType.getSelectedItem();
        String title = type;
        if ("Surgery".equals(type) || "Other".equals(type)) {
            title = editProcedureName.getText().toString().trim();
            if (title.isEmpty())
                title = type;
        }

        String notes = editNotes.getText().toString().trim();
        String notifMsg = editNotificationText.getText().toString().trim();
        if (notifMsg.isEmpty())
            notifMsg = "Check " + title + " — scheduled review";

        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        progressBar.setVisibility(View.VISIBLE);
        btnSchedule.setEnabled(false);

        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("authorId", userId);
            body.put("type", "PROCEDURE");
            body.put("title", title);
            body.put("priority", "ROUTINE");
            body.put("notes", notes);

            if (reminderCalendar != null) {
                body.put("reminderAt", isoFormat.format(reminderCalendar.getTime()));
            }

            JSONObject details = new JSONObject();
            details.put("interventionType", type);
            details.put("timeDone", isoFormat.format(timeDoneCalendar.getTime()));
            details.put("notificationText", notifMsg);

            body.put("details", details);

            ApiClient.post("/orders", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String responseStr) {
                    runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        Toast.makeText(AddInterventionActivity.this, "Intervention scheduled", Toast.LENGTH_SHORT)
                                .show();
                        setResult(RESULT_OK);
                        finish();
                    });
                }

                @Override
                public void onError(Exception error) {
                    runOnUiThread(() -> {
                        progressBar.setVisibility(View.GONE);
                        btnSchedule.setEnabled(true);
                        Toast.makeText(AddInterventionActivity.this, "Failed: " + error.getMessage(),
                                Toast.LENGTH_SHORT).show();
                    });
                }
            });

        } catch (Exception e) {
            progressBar.setVisibility(View.GONE);
            btnSchedule.setEnabled(true);
            Toast.makeText(this, "Error building request", Toast.LENGTH_SHORT).show();
        }
    }
}
