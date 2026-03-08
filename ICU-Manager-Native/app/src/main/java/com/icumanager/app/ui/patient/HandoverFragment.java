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
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONArray;
import org.json.JSONException;

public class HandoverFragment extends Fragment {
    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;
    private HandoverAdapter adapter;

    public static HandoverFragment newInstance(String patientId) {
        HandoverFragment fragment = new HandoverFragment();
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
        View view = inflater.inflate(R.layout.fragment_handover, container, false);

        RecyclerView recyclerView = view.findViewById(R.id.recyclerViewHandover);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new HandoverAdapter();
        recyclerView.setAdapter(adapter);

        FloatingActionButton fab = view.findViewById(R.id.fabAddHandover);
        fab.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), UpdateHandoverActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, 300);
        });

        loadHandoverNotes();

        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 300 && resultCode == Activity.RESULT_OK) {
            loadHandoverNotes();
        }
    }

    private void loadHandoverNotes() {
        if (getActivity() == null)
            return;

        SharedPreferences prefs = getActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/specialist/patient/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            JSONArray notes = new JSONArray(responseStr);
                            adapter.setNotes(notes);
                        } catch (JSONException e) {
                            Toast.makeText(getContext(), "Failed to parse Handover Notes", Toast.LENGTH_SHORT).show();
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
