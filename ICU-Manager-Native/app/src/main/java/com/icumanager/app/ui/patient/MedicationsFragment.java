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
        adapter = new MedicationsAdapter(med -> confirmAdministration(med));
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
        if (getActivity() == null)
            return;

        String medName = med.optString("name", "Unknown Medication");

        new AlertDialog.Builder(getActivity())
                .setTitle("Record Dose")
                .setMessage("Are you sure you want to record a dose for " + medName + "?")
                .setPositiveButton("Administer", (dialog, which) -> administerMedication(med))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void administerMedication(JSONObject med) {
        if (getActivity() == null)
            return;

        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");
        String medicationId = med.optString("id", "");
        String dose = med.optString("defaultDose", "");

        try {
            JSONObject body = new JSONObject();
            body.put("patientId", patientId);
            body.put("medicationId", medicationId);
            body.put("status", "Given");
            body.put("dose", dose);
            body.put("userId", userId);

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
}
