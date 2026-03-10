package com.icumanager.app.ui.dashboard;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import com.icumanager.app.ui.patient.AddPatientActivity;
import com.icumanager.app.ui.patient.PatientDetailsActivity;

import org.json.JSONArray;
import org.json.JSONException;

public class PatientsFragment extends Fragment {

    private RecyclerView recyclerViewPatients;
    private PatientAdapter patientAdapter;
    private ProgressBar progressBar;
    private FloatingActionButton fabAddPatient;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_patients, container, false);

        recyclerViewPatients = view.findViewById(R.id.recyclerViewPatients);
        progressBar = view.findViewById(R.id.progressBar);
        fabAddPatient = view.findViewById(R.id.fabAddPatient);

        recyclerViewPatients.setLayoutManager(new LinearLayoutManager(getContext()));
        patientAdapter = new PatientAdapter(patientId -> {
            Intent intent = new Intent(getActivity(), PatientDetailsActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivity(intent);
        });
        recyclerViewPatients.setAdapter(patientAdapter);

        fabAddPatient.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), AddPatientActivity.class);
            startActivity(intent);
        });

        loadPatients();

        return view;
    }

    private void loadPatients() {
        String token = getToken();
        if (token == null)
            return;

        progressBar.setVisibility(View.VISIBLE);
        ApiClient.get("/patients", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() == null)
                    return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    try {
                        JSONArray patients = new JSONArray(responseStr);
                        patientAdapter.setPatients(patients);
                    } catch (JSONException e) {
                        Toast.makeText(getContext(), "Failed to parse patients", Toast.LENGTH_SHORT).show();
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() == null)
                    return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    Toast.makeText(getContext(), "Failed to load patients", Toast.LENGTH_SHORT).show();
                });
            }
        });
    }

    private String getToken() {
        if (getActivity() == null)
            return null;
        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        return prefs.getString("auth_token", null);
    }
}
