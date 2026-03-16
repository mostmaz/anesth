package com.icumanager.app.ui.patient;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

public class ConsultationFragment extends Fragment {

    private static final int REQUEST_ADD_CONSULT = 801;
    private String patientId;
    private RecyclerView recyclerView;
    private ConsultationAdapter adapter;
    private ProgressBar progressBar;
    private TextView textEmpty;
    private FloatingActionButton fabAdd;

    public static ConsultationFragment newInstance(String patientId) {
        ConsultationFragment fragment = new ConsultationFragment();
        Bundle args = new Bundle();
        args.putString("patient_id", patientId);
        fragment.setArguments(args);
        return fragment;
    }

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getArguments() != null) {
            patientId = getArguments().getString("patient_id");
        }
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_consultation, container, false);

        recyclerView = view.findViewById(R.id.recyclerConsultations);
        progressBar = view.findViewById(R.id.progressConsultation);
        textEmpty = view.findViewById(R.id.textConsultEmpty);
        fabAdd = view.findViewById(R.id.fabAddConsultation);

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new ConsultationAdapter();
        recyclerView.setAdapter(adapter);

        fabAdd.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), AddConsultationActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, REQUEST_ADD_CONSULT);
        });

        loadConsultations();
        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_ADD_CONSULT && resultCode == android.app.Activity.RESULT_OK) {
            loadConsultations();
        }
    }

    private void loadConsultations() {
        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        progressBar.setVisibility(View.VISIBLE);
        textEmpty.setVisibility(View.GONE);

        ApiClient.get("/patients/" + patientId + "/consultations", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    try {
                        JSONArray array;
                        // Response may be wrapped or direct array
                        if (responseStr.trim().startsWith("[")) {
                            array = new JSONArray(responseStr);
                        } else {
                            JSONObject obj = new JSONObject(responseStr);
                            array = obj.optJSONArray("data");
                            if (array == null) array = new JSONArray();
                        }
                        adapter.setConsultations(array);
                        textEmpty.setVisibility(array.length() == 0 ? View.VISIBLE : View.GONE);
                    } catch (Exception e) {
                        textEmpty.setVisibility(View.VISIBLE);
                        Toast.makeText(getContext(), "Failed to parse consultations", Toast.LENGTH_SHORT).show();
                    }
                });
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() == null) return;
                getActivity().runOnUiThread(() -> {
                    progressBar.setVisibility(View.GONE);
                    textEmpty.setVisibility(View.VISIBLE);
                    Toast.makeText(getContext(), "Failed to load consultations", Toast.LENGTH_SHORT).show();
                });
            }
        });
    }
}
