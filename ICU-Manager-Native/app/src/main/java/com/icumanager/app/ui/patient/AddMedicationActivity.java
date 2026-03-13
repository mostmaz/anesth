package com.icumanager.app.ui.patient;

import android.app.DatePickerDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.widget.AdapterView;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;

import com.google.android.material.textfield.TextInputEditText;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class AddMedicationActivity extends AppCompatActivity {

    // Common ICU drugs matching webapp list
    private static final DrugEntry[] COMMON_ICU_DRUGS = {
        new DrugEntry("Norepinephrine",         "0.05 mcg/kg/min", "IV"),
        new DrugEntry("Propofol",               "10 mg/ml",        "IV"),
        new DrugEntry("Fentanyl",               "50 mcg",          "IV"),
        new DrugEntry("Midazolam",              "2 mg",            "IV"),
        new DrugEntry("Hydrocortisone",         "100 mg",          "IV"),
        new DrugEntry("Pantoprazole",           "40 mg",           "IV"),
        new DrugEntry("Meropenem",              "1 g",             "IV"),
        new DrugEntry("Piperacillin/Tazobactam","4.5 g",           "IV"),
        new DrugEntry("Vancomycin",             "1 g",             "IV"),
        new DrugEntry("Furosemide",             "20 mg",           "IV"),
        new DrugEntry("Insulin Actrapid",       "10 units",        "SC"),
        new DrugEntry("Paracetamol",            "1 g",             "IV"),
        new DrugEntry("Enoxaparin",             "40 mg",           "SC"),
        new DrugEntry("Amiodarone",             "150 mg",          "IV"),
        new DrugEntry("Adrenaline",             "1 mg",            "IV"),
        new DrugEntry("Dobutamine",             "250 mg",          "IV"),
    };

    private static final String[] ROUTE_OPTIONS   = {"IV", "PO", "IM", "SC", "NEB", "LOCAL", "EYE_DROP"};
    private static final String[] FREQ_VALUES     = {"OD (Once Daily)", "BD (Twice Daily)", "TDS (Thrice Daily)",
                                                      "QID (Four times)", "5x/Day", "6x/Day (Q4H)", "Once Only"};

    private String patientId;

    private android.widget.AutoCompleteTextView editMedName;
    private ListView listSuggestions;
    private TextInputEditText editMedDose;
    private Spinner spinnerRoute;
    private Spinner spinnerFrequency;
    private Button btnStartDate;
    private TextInputEditText editMedInfusionRate;
    private TextInputEditText editMedDilution;
    private TextInputEditText editMedReminder;
    private TextInputEditText editMedInstructions;
    private Button btnSubmitMed;
    private ProgressBar progressSubmitMed;

    private String selectedStartDate; // ISO date string YYYY-MM-DD
    private List<DrugEntry> currentSuggestions = new ArrayList<>();
    private DrugSuggestionAdapter suggestionAdapter;
    private android.os.Handler searchHandler = new android.os.Handler();
    private Runnable searchRunnable;

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
        }
        toolbar.setNavigationOnClickListener(v -> finish());

        editMedName       = findViewById(R.id.editMedName);
        listSuggestions   = findViewById(R.id.listDrugSuggestions);
        editMedDose       = findViewById(R.id.editMedDose);
        spinnerRoute      = findViewById(R.id.spinnerRoute);
        spinnerFrequency  = findViewById(R.id.spinnerFrequency);
        btnStartDate      = findViewById(R.id.btnStartDate);
        editMedInfusionRate = findViewById(R.id.editMedInfusionRate);
        editMedDilution   = findViewById(R.id.editMedDilution);
        editMedReminder   = findViewById(R.id.editMedReminder);
        editMedInstructions = findViewById(R.id.editMedInstructions);
        btnSubmitMed      = findViewById(R.id.btnSubmitMed);
        progressSubmitMed = findViewById(R.id.progressSubmitMed);

        setupRouteSpinner();
        setupFrequencySpinner();
        setupStartDate();
        setupDrugSearch();

        btnSubmitMed.setOnClickListener(v -> submitMedication());
    }

    private void setupRouteSpinner() {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, ROUTE_OPTIONS);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerRoute.setAdapter(adapter);
    }

    private void setupFrequencySpinner() {
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_item, FREQ_VALUES);
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item);
        spinnerFrequency.setAdapter(adapter);
    }

    private void setupStartDate() {
        // Default to today
        Calendar cal = Calendar.getInstance();
        selectedStartDate = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(cal.getTime());
        btnStartDate.setText(selectedStartDate);

        btnStartDate.setOnClickListener(v -> {
            Calendar c = Calendar.getInstance();
            new DatePickerDialog(this, (view, year, month, day) -> {
                selectedStartDate = String.format(Locale.getDefault(), "%04d-%02d-%02d", year, month + 1, day);
                btnStartDate.setText(selectedStartDate);
            }, c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)).show();
        });
    }

    private void setupDrugSearch() {
        suggestionAdapter = new DrugSuggestionAdapter(this, currentSuggestions);
        listSuggestions.setAdapter(suggestionAdapter);

        // Show all common drugs initially on focus
        editMedName.setOnFocusChangeListener((v, hasFocus) -> {
            if (hasFocus) {
                updateSuggestions(editMedName.getText() != null ? editMedName.getText().toString() : "");
                listSuggestions.setVisibility(View.VISIBLE);
            }
        });

        editMedName.addTextChangedListener(new android.text.TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void afterTextChanged(android.text.Editable s) {}

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                String query = s.toString();
                if (searchRunnable != null) searchHandler.removeCallbacks(searchRunnable);

                // Immediately filter local list
                updateLocalSuggestions(query);
                listSuggestions.setVisibility(View.VISIBLE);

                // Debounced API search (300ms)
                if (query.length() > 1) {
                    searchRunnable = () -> searchDrugsFromApi(query);
                    searchHandler.postDelayed(searchRunnable, 300);
                }
            }
        });

        listSuggestions.setOnItemClickListener((parent, view, position, id) -> {
            DrugEntry drug = currentSuggestions.get(position);
            editMedName.setText(drug.name);
            if (drug.defaultDose != null && !drug.defaultDose.isEmpty()) {
                editMedDose.setText(drug.defaultDose);
            }
            if (drug.defaultRoute != null) {
                int idx = Arrays.asList(ROUTE_OPTIONS).indexOf(drug.defaultRoute);
                if (idx >= 0) spinnerRoute.setSelection(idx);
            }
            listSuggestions.setVisibility(View.GONE);
        });
    }

    private void updateLocalSuggestions(String query) {
        List<DrugEntry> filtered = new ArrayList<>();
        for (DrugEntry d : COMMON_ICU_DRUGS) {
            if (query.isEmpty() || d.name.toLowerCase().contains(query.toLowerCase())) {
                filtered.add(d);
            }
        }
        currentSuggestions.clear();
        currentSuggestions.addAll(filtered);
        suggestionAdapter.notifyDataSetChanged();
    }

    private void updateSuggestions(String query) {
        updateLocalSuggestions(query);
    }

    private void searchDrugsFromApi(String query) {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/medications/catalog?q=" + query, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                try {
                    JSONArray results = new JSONArray(response);
                    List<DrugEntry> apiDrugs = new ArrayList<>();
                    for (int i = 0; i < results.length(); i++) {
                        JSONObject obj = results.getJSONObject(i);
                        String name = obj.optString("name", "");
                        String dose = obj.optString("defaultDose", "");
                        String route = obj.optString("defaultRoute", "");
                        if (!name.isEmpty()) apiDrugs.add(new DrugEntry(name, dose, route));
                    }
                    runOnUiThread(() -> {
                        // Merge with local, deduplicate by name
                        List<DrugEntry> merged = new ArrayList<>();
                        List<String> seen = new ArrayList<>();
                        for (DrugEntry d : currentSuggestions) { merged.add(d); seen.add(d.name); }
                        for (DrugEntry d : apiDrugs) {
                            if (!seen.contains(d.name)) { merged.add(d); seen.add(d.name); }
                        }
                        currentSuggestions.clear();
                        currentSuggestions.addAll(merged);
                        suggestionAdapter.notifyDataSetChanged();
                    });
                } catch (JSONException ignored) {}
            }

            @Override
            public void onError(Exception error) {}
        });
    }

    private void submitMedication() {
        String name    = editMedName.getText() != null ? editMedName.getText().toString().trim() : "";
        String dose    = editMedDose.getText() != null ? editMedDose.getText().toString().trim() : "";
        String route   = (String) spinnerRoute.getSelectedItem();
        String freq    = (String) spinnerFrequency.getSelectedItem();
        String infusion= editMedInfusionRate.getText() != null ? editMedInfusionRate.getText().toString().trim() : "";
        String dilution= editMedDilution.getText() != null ? editMedDilution.getText().toString().trim() : "";
        String reminder= editMedReminder.getText() != null ? editMedReminder.getText().toString().trim() : "";
        String inst    = editMedInstructions.getText() != null ? editMedInstructions.getText().toString().trim() : "";

        if (name.isEmpty() || dose.isEmpty()) {
            Toast.makeText(this, "Medication name and dose are required", Toast.LENGTH_SHORT).show();
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
            body.put("frequency", freq);
            body.put("startedAt", selectedStartDate + "T00:00:00.000Z");
            if (!infusion.isEmpty()) body.put("infusionRate", infusion);
            if (!dilution.isEmpty()) body.put("dilution", Double.parseDouble(dilution));
            if (!reminder.isEmpty()) body.put("durationReminder", Integer.parseInt(reminder));
            if (!inst.isEmpty()) body.put("otherInstructions", inst);

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
                        Toast.makeText(AddMedicationActivity.this, "Failed: " + error.getMessage(), Toast.LENGTH_LONG).show();
                    });
                }
            });
        } catch (JSONException e) {
            progressSubmitMed.setVisibility(View.GONE);
            btnSubmitMed.setEnabled(true);
            Toast.makeText(this, "Error building request", Toast.LENGTH_SHORT).show();
        }
    }

    // --- Inner classes ---

    static class DrugEntry {
        String name, defaultDose, defaultRoute;
        DrugEntry(String name, String defaultDose, String defaultRoute) {
            this.name = name;
            this.defaultDose = defaultDose;
            this.defaultRoute = defaultRoute;
        }
    }

    static class DrugSuggestionAdapter extends ArrayAdapter<DrugEntry> {
        DrugSuggestionAdapter(Context ctx, List<DrugEntry> items) {
            super(ctx, 0, items);
        }

        @Override
        public View getView(int position, View convertView, ViewGroup parent) {
            if (convertView == null) {
                convertView = android.view.LayoutInflater.from(getContext())
                        .inflate(android.R.layout.two_line_list_item, parent, false);
            }
            DrugEntry drug = getItem(position);
            TextView text1 = convertView.findViewById(android.R.id.text1);
            TextView text2 = convertView.findViewById(android.R.id.text2);
            text1.setText(drug != null ? drug.name : "");
            text1.setTextColor(0xFF0F172A);
            text1.setTextSize(14);
            text2.setText(drug != null && drug.defaultDose != null ? drug.defaultDose : "");
            text2.setTextColor(0xFF64748B);
            text2.setTextSize(12);
            convertView.setPadding(32, 16, 32, 16);
            return convertView;
        }
    }
}
