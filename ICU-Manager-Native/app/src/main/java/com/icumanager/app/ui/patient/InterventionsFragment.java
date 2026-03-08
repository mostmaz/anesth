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
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import android.content.Intent;
import android.app.Activity;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONArray;
import org.json.JSONObject;

public class InterventionsFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;
    private InterventionsAdapter adapter;

    public static InterventionsFragment newInstance(String patientId) {
        InterventionsFragment fragment = new InterventionsFragment();
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
        View view = inflater.inflate(R.layout.fragment_interventions, container, false);

        RecyclerView recyclerView = view.findViewById(R.id.recyclerViewInterventions);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new InterventionsAdapter();
        recyclerView.setAdapter(adapter);

        FloatingActionButton fab = view.findViewById(R.id.fabAddIntervention);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getContext(), AddInterventionActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, 100);
        });

        loadInterventions();

        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 100 && resultCode == Activity.RESULT_OK) {
            loadInterventions();
        }
    }

    private void loadInterventions() {
        if (getActivity() == null)
            return;

        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/orders/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            JSONArray allOrders = new JSONArray(responseStr);
                            JSONArray procedures = new JSONArray();

                            for (int i = 0; i < allOrders.length(); i++) {
                                JSONObject order = allOrders.optJSONObject(i);
                                if (order != null && "PROCEDURE".equals(order.optString("type"))) {
                                    procedures.put(order);
                                }
                            }

                            adapter.setOrders(procedures);
                        } catch (Exception e) {
                            Toast.makeText(getContext(), "Failed to parse Interventions", Toast.LENGTH_SHORT).show();
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
}
