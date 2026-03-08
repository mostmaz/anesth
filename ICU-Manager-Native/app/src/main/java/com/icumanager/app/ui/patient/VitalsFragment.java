package com.icumanager.app.ui.patient;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import android.content.Intent;
import android.app.Activity;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;

public class VitalsFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;

    public static VitalsFragment newInstance(String patientId) {
        VitalsFragment fragment = new VitalsFragment();
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
        View view = inflater.inflate(R.layout.fragment_vitals, container, false);
        androidx.recyclerview.widget.RecyclerView recyclerView = view.findViewById(R.id.recyclerViewVitals);
        recyclerView.setLayoutManager(new androidx.recyclerview.widget.LinearLayoutManager(getContext()));
        VitalsAdapter adapter = new VitalsAdapter();
        recyclerView.setAdapter(adapter);

        FloatingActionButton fab = view.findViewById(R.id.fabAddVitals);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), AddVitalsActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, 100);
        });

        loadVitals();

        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 100 && resultCode == Activity.RESULT_OK) {
            loadVitals(); // Reload vitals after submitting new ones
        }
    }

    private void loadVitals() {
        android.content.SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS",
                android.content.Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        com.icumanager.app.network.ApiClient.get("/vitals/" + patientId, token,
                new com.icumanager.app.network.ApiClient.ApiCallback() {
                    @Override
                    public void onSuccess(String responseStr) {
                        if (getActivity() != null) {
                            getActivity().runOnUiThread(() -> {
                                try {
                                    org.json.JSONArray vitals = new org.json.JSONArray(responseStr);
                                    androidx.recyclerview.widget.RecyclerView rv = getView() != null
                                            ? getView().findViewById(R.id.recyclerViewVitals)
                                            : null;
                                    if (rv != null && rv.getAdapter() instanceof VitalsAdapter) {
                                        ((VitalsAdapter) rv.getAdapter()).setVitals(vitals);
                                    }
                                } catch (org.json.JSONException e) {
                                    android.widget.Toast.makeText(getContext(), "Failed to parse vitals",
                                            android.widget.Toast.LENGTH_SHORT).show();
                                }
                            });
                        }
                    }

                    @Override
                    public void onError(Exception error) {
                        if (getActivity() != null) {
                            getActivity().runOnUiThread(() -> {
                                android.widget.Toast.makeText(getContext(), "Network error: " + error.getMessage(),
                                        android.widget.Toast.LENGTH_SHORT).show();
                            });
                        }
                    }
                });
    }
}
