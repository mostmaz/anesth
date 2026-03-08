package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import android.app.Activity;
import android.content.Intent;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONArray;
import org.json.JSONObject;

public class IoFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;
    private IoAdapter adapter;
    private TextView textSummary;

    public static IoFragment newInstance(String patientId) {
        IoFragment fragment = new IoFragment();
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
        View view = inflater.inflate(R.layout.fragment_io, container, false);

        textSummary = view.findViewById(R.id.textIoSummary);
        RecyclerView recyclerView = view.findViewById(R.id.recyclerViewIo);

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new IoAdapter();
        recyclerView.setAdapter(adapter);

        FloatingActionButton fab = view.findViewById(R.id.fabAddIo);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), AddIoActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, 200);
        });

        loadIoHistory();

        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 200 && resultCode == Activity.RESULT_OK) {
            loadIoHistory();
        }
    }

    private void loadIoHistory() {
        if (getActivity() == null)
            return;

        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/io/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            JSONArray history = new JSONArray(responseStr);

                            int totalIn = 0;
                            int totalOut = 0;

                            for (int i = 0; i < history.length(); i++) {
                                JSONObject entry = history.optJSONObject(i);
                                if (entry != null) {
                                    int amt = entry.optInt("amount", 0);
                                    if ("INPUT".equals(entry.optString("type"))) {
                                        totalIn += amt;
                                    } else {
                                        totalOut += amt;
                                    }
                                }
                            }

                            int balance = totalIn - totalOut;
                            String prefix = balance > 0 ? "+" : "";
                            textSummary.setText("Net: " + prefix + balance + " mL");
                            if (balance >= 0) {
                                textSummary.setTextColor(Color.parseColor("#4ADE80")); // Green
                            } else {
                                textSummary.setTextColor(Color.parseColor("#F87171")); // Red
                            }

                            adapter.setEntries(history);
                        } catch (Exception e) {
                            Toast.makeText(getContext(), "Failed to parse I/O data", Toast.LENGTH_SHORT).show();
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
