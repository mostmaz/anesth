package com.icumanager.app.ui.patient;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
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
import com.icumanager.app.R;
import com.icumanager.app.models.VentilatorSetting;
import com.icumanager.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class VentilatorFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;
    private RecyclerView recyclerView;
    private VentilatorAdapter adapter;

    public static VentilatorFragment newInstance(String patientId) {
        VentilatorFragment fragment = new VentilatorFragment();
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
        View view = inflater.inflate(R.layout.fragment_ventilator, container, false);

        recyclerView = view.findViewById(R.id.recyclerViewVentilator);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));

        adapter = new VentilatorAdapter(new ArrayList<>());
        recyclerView.setAdapter(adapter);

        FloatingActionButton fab = view.findViewById(R.id.fabAddVentilator);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), AddVentilatorActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, 201); // 201 for AddVentilator
        });

        loadVentilatorSettings();

        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 201 && resultCode == Activity.RESULT_OK) {
            loadVentilatorSettings(); // Reload settings after adding new ones
        }
    }

    private void loadVentilatorSettings() {
        if (getActivity() == null)
            return;
        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/ventilator/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            JSONArray jsonArray = new JSONArray(responseStr);
                            List<VentilatorSetting> settingsList = new ArrayList<>();
                            for (int i = 0; i < jsonArray.length(); i++) {
                                JSONObject obj = jsonArray.getJSONObject(i);
                                VentilatorSetting setting = new VentilatorSetting();
                                setting.setId(obj.optString("id"));
                                setting.setPatientId(obj.optString("patientId"));
                                setting.setUserId(obj.optString("userId"));
                                setting.setMode(obj.optString("mode"));
                                setting.setRate(obj.optInt("rate"));
                                setting.setFio2(obj.optInt("fio2"));
                                setting.setIe(obj.optString("ie"));
                                setting.setPs(obj.optInt("ps"));
                                setting.setVt(obj.optInt("vt"));
                                setting.setTimestamp(obj.optString("timestamp"));
                                settingsList.add(setting);
                            }
                            adapter.updateData(settingsList);
                        } catch (Exception e) {
                            Toast.makeText(getContext(), "Failed to parse ventilator data", Toast.LENGTH_SHORT).show();
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
