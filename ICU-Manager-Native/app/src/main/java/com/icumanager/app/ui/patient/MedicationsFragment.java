package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import android.content.Intent;
import android.app.Activity;
import android.app.AlertDialog;
import android.text.InputType;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.LinearLayout;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

public class MedicationsFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;
    private MedicationsAdapter adapter;

    public static MedicationsFragment newInstance(String patientId) {
        MedicationsFragment fragment = new MedicationsFragment();
        Bundle args = new Bundle();
        args.putString(ARG_PATIENT_ID, patientId);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            patientId = getArguments().getString(ARG_PATIENT_ID);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_medications, container, false);

        RecyclerView recyclerView = view.findViewById(R.id.recyclerViewMedications);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new MedicationsAdapter(new MedicationsAdapter.OnMedicationActionListener() {
            @Override
            public void onAdminister(JSONObject med) {
                confirmAdministration(med);
            }

            @Override
            public void onStop(JSONObject med) {
                confirmDiscontinuation(med);
            }

            @Override
            public void onShowHistory(JSONObject med) {
                showAdminHistory(med);
            }
        });
        recyclerView.setAdapter(adapter);

        FloatingActionButton fab = view.findViewById(R.id.fabAddMedication);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), AddMedicationActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, 500);
        });

        loadMedications();

        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 500 && resultCode == Activity.RESULT_OK) {
            loadMedications();
        }
    }

    private void loadMedications() {
        if (getActivity() == null)
            return;

        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/medications/" + patientId + "/mar", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            JSONArray medications = new JSONArray(responseStr);
                            adapter.setMedications(medications);
                        } catch (JSONException e) {
                            Toast.makeText(getContext(), "Failed to parse MAR", Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        Toast.makeText(getContext(), "Network error: " + error.getMessage(), Toast.LENGTH_SHORT).show();
                    });
                }
            }
        });
    }

    private void confirmAdministration(JSONObject med) {
        if (getActivity() == null) return;

        String medName   = med.optString("name", "Unknown Medication");
        String defDose   = med.optString("defaultDose", "");
        String defDilution = med.optString("dilution", "");
        String infRate   = med.optString("infusionRate", "");

        // Build a small form layout: dose field + dilution field
        LinearLayout layout = new LinearLayout(getActivity());
        layout.setOrientation(LinearLayout.VERTICAL);
        int pad = (int)(16 * getResources().getDisplayMetrics().density);
        layout.setPadding(pad, pad / 2, pad, 0);

        EditText editDose = new EditText(getActivity());
        editDose.setHint("Dose (e.g. " + defDose + ")");
        editDose.setText(defDose);
        editDose.setInputType(InputType.TYPE_CLASS_TEXT);
        layout.addView(editDose);

        EditText editDilution = new EditText(getActivity());
        editDilution.setHint("Dilution volume mL" + (defDilution.isEmpty() ? "" : " (default: " + defDilution + " mL)"));
        if (!defDilution.isEmpty() && !defDilution.equals("null")) {
            editDilution.setText(defDilution);
        }
        editDilution.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        editDilution.setImeOptions(EditorInfo.IME_ACTION_DONE);
        layout.addView(editDilution);

        String rateInfo = infRate.isEmpty() ? "" : "\nRate: " + infRate;

        new AlertDialog.Builder(getActivity())
                .setTitle("Record Dose — " + medName)
                .setMessage("Confirm administration" + rateInfo)
                .setView(layout)
                .setPositiveButton("Administer", (dialog, which) -> {
                    String dose     = editDose.getText().toString().trim();
                    String dilution = editDilution.getText().toString().trim();
                    administerMedication(med, dose.isEmpty() ? defDose : dose, dilution);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void administerMedication(JSONObject med, String dose, String dilution) {
        if (getActivity() == null) return;

        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token        = prefs.getString("auth_token", null);
        String userId       = prefs.getString("user_id", "");
        String medicationId = med.optString("id", "");

        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("medicationId", medicationId);
            body.put("status", "Given");
            body.put("dose", dose);
            body.put("userId", userId);
            if (!dilution.isEmpty()) {
                body.put("dilutionVolume", Double.parseDouble(dilution));
            }

            ApiClient.post("/medications/administer", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            Toast.makeText(getContext(), "Dose recorded successfully", Toast.LENGTH_SHORT).show();
                            loadMedications();
                        });
                    }
                }

                @Override
                public void onError(Exception error) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            Toast.makeText(getContext(), "Failed to record dose: " + error.getMessage(),
                                    Toast.LENGTH_LONG).show();
                        });
                    }
                }
            });
        } catch (JSONException e) {
            Toast.makeText(getContext(), "JSON Error", Toast.LENGTH_SHORT).show();
        }
    }

    private void confirmDiscontinuation(JSONObject med) {
        String medName = med.optString("name", "Unknown Medication");
        new AlertDialog.Builder(getActivity())
                .setTitle("Stop Medication")
                .setMessage("Are you sure you want to discontinue " + medName + "?")
                .setPositiveButton("Stop", (dialog, which) -> stopMedication(med))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void stopMedication(JSONObject med) {
        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String medId = med.optString("id", "");

        try {
            JSONObject body = new JSONObject();
            body.put("isActive", false);

            ApiClient.put("/medications/" + medId + "/status", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            Toast.makeText(getContext(), "Medication discontinued", Toast.LENGTH_SHORT).show();
                            loadMedications();
                        });
                    }
                }

                @Override
                public void onError(Exception error) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            Toast.makeText(getContext(), "Failed to stop: " + error.getMessage(), Toast.LENGTH_SHORT)
                                    .show();
                        });
                    }
                }
            });
        } catch (JSONException ignored) {
        }
    }

    private void showAdminHistory(JSONObject med) {
        String medId = med.optString("id", "");
        String medName = med.optString("name", "Medication");
        JSONArray history = med.optJSONArray("Administrations");
        if (history == null || history.length() == 0) {
            Toast.makeText(getContext(), "No administration history found", Toast.LENGTH_SHORT).show();
            return;
        }

        String[] items = new String[history.length()];
        for (int i = 0; i < history.length(); i++) {
            JSONObject adm = history.optJSONObject(i);
            String time = adm.optString("administeredAt", "").split("\\.")[0].replace("T", " ");
            String dose = adm.optString("dose", "");
            JSONObject user = adm.optJSONObject("User");
            String nurse = (user != null) ? user.optString("name", "Nurse") : "Nurse";
            items[i] = time + " | " + dose + " (" + nurse + ")";
        }

        new AlertDialog.Builder(getActivity())
                .setTitle(medName + " History")
                .setItems(items, (dialog, which) -> {
                    confirmDeleteAdministration(history.optJSONObject(which));
                })
                .setNegativeButton("Close", null)
                .show();
    }

    private void confirmDeleteAdministration(JSONObject adm) {
        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String role = prefs.getString("user_role", "");

        if (!"SENIOR".equals(role)) {
            Toast.makeText(getContext(), "Only seniors can delete administrations", Toast.LENGTH_SHORT).show();
            return;
        }

        new AlertDialog.Builder(getActivity())
                .setTitle("Delete Administration")
                .setMessage("Are you sure you want to delete this dose record?")
                .setPositiveButton("Delete", (dialog, which) -> deleteAdministration(adm))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void deleteAdministration(JSONObject adm) {
        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String admId = adm.optString("id", "");

        ApiClient.delete("/medications/administration/" + admId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String response) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        Toast.makeText(getContext(), "Record deleted", Toast.LENGTH_SHORT).show();
                        loadMedications();
                    });
                }
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        Toast.makeText(getContext(), "Failed: " + error.getMessage(), Toast.LENGTH_SHORT).show();
                    });
                }
            }
        });
    }
}
