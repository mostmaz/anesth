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
import android.widget.TextView;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

public class InvestigationsFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private static final String ARG_FILTER_TYPE = "filter_type";
    private String patientId;
    private String filterType;
    private InvestigationsAdapter adapter;

    public static InvestigationsFragment newInstance(String patientId, String filterType) {
        InvestigationsFragment fragment = new InvestigationsFragment();
        Bundle args = new Bundle();
        args.putString(ARG_PATIENT_ID, patientId);
        args.putString(ARG_FILTER_TYPE, filterType);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            patientId = getArguments().getString(ARG_PATIENT_ID);
            filterType = getArguments().getString(ARG_FILTER_TYPE);
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_investigations, container, false);

        TextView header = view.findViewById(R.id.textInvestigationsHeader);
        if ("LAB".equals(filterType)) {
            header.setText("Lab Results");
        } else if ("IMAGING".equals(filterType)) {
            header.setText("Imaging");
        } else {
            header.setText("Cardiology");
        }

        RecyclerView recyclerView = view.findViewById(R.id.recyclerViewInvestigations);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new InvestigationsAdapter();
        recyclerView.setAdapter(adapter);

        FloatingActionButton fab = view.findViewById(R.id.fabAddInvestigation);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), UploadInvestigationActivity.class);
            intent.putExtra("patient_id", patientId);
            intent.putExtra("filter_type", filterType);
            startActivityForResult(intent, 600);
        });

        loadInvestigations();

        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 600 && resultCode == Activity.RESULT_OK) {
            loadInvestigations();
        }
    }

    private void loadInvestigations() {
        if (getActivity() == null)
            return;

        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/investigations/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            // Server may return a plain array OR wrap it in {"data": [...]}
                            JSONArray investigations;
                            try {
                                investigations = new JSONArray(responseStr);
                            } catch (Exception e) {
                                JSONObject wrapper = new JSONObject(responseStr);
                                if (wrapper.has("data")) {
                                    investigations = wrapper.getJSONArray("data");
                                } else {
                                    // Try first array-valued key
                                    String firstKey = wrapper.keys().next();
                                    investigations = wrapper.getJSONArray(firstKey);
                                }
                            }

                            JSONArray filtered = new JSONArray();
                            for (int i = 0; i < investigations.length(); i++) {
                                JSONObject inv = investigations.optJSONObject(i);
                                if (inv != null) {
                                    // Case-insensitive comparisons so "lab" == "LAB" etc.
                                    String type     = inv.optString("type", "").toUpperCase();
                                    String category = inv.optString("category", "").toLowerCase();
                                    String title    = inv.optString("title", "").toLowerCase();

                                    boolean isCardio = title.contains("ecg")
                                            || title.contains("echo")
                                            || category.contains("cardio");

                                    if ("CARDIOLOGY".equals(filterType)) {
                                        if (isCardio) filtered.put(inv);
                                    } else if ("IMAGING".equals(filterType)) {
                                        if ("IMAGING".equals(type) && !isCardio) filtered.put(inv);
                                    } else { // LAB
                                        if ("LAB".equals(type) && !isCardio) filtered.put(inv);
                                    }
                                }
                            }
                            adapter.setInvestigations(filtered);
                        } catch (Exception e) {
                            Toast.makeText(getContext(), "Failed to parse Investigations: " + e.getMessage(),
                                    Toast.LENGTH_SHORT).show();
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
