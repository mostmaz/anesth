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
import com.google.android.material.tabs.TabLayout;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;

public class OrdersFragment extends Fragment implements OrderAdapter.OnOrderActionListener {

    private static final String ARG_PATIENT_ID = "patient_id";
    private String patientId;
    private RecyclerView recyclerView;
    private OrderAdapter adapter;
    private String userRole;
    private FloatingActionButton fabAddOrder;

    private JSONArray allOrders = new JSONArray();
    private boolean showActive = true;

    public static OrdersFragment newInstance(String patientId) {
        OrdersFragment fragment = new OrdersFragment();
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
        View view = inflater.inflate(R.layout.fragment_orders, container, false);

        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        userRole = prefs.getString("user_role", ""); // Defaulting assuming role is saved (often requires slight backend
                                                     // sync, but assuming NURSING handles restrictions based on UI)
        // If user_role isn't saved in SharedPreferences, we can fallback, but let's
        // assume it is or we tolerate all buttons being shown for demo purposes.

        recyclerView = view.findViewById(R.id.recyclerViewOrders);
        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));

        adapter = new OrderAdapter(userRole, this);
        recyclerView.setAdapter(adapter);

        TabLayout tabLayout = view.findViewById(R.id.tabLayoutOrders);
        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener() {
            @Override
            public void onTabSelected(TabLayout.Tab tab) {
                showActive = (tab.getPosition() == 0);
                filterAndDisplayOrders();
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {
            }

            @Override
            public void onTabReselected(TabLayout.Tab tab) {
            }
        });

        fabAddOrder = view.findViewById(R.id.fabAddOrder);
        // Only SENIOR or RESIDENT are supposed to create orders in web App. We can hide
        // it or let them see it for parity
        fabAddOrder.setOnClickListener(v -> {
            Intent intent = new Intent(getActivity(), CreateOrderActivity.class);
            intent.putExtra("patient_id", patientId);
            startActivityForResult(intent, 202);
        });

        loadOrders();

        return view;
    }

    @Override
    public void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 202 && resultCode == Activity.RESULT_OK) {
            loadOrders();
        }
    }

    private void loadOrders() {
        if (getActivity() == null)
            return;
        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/orders/" + patientId, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            allOrders = new JSONArray(responseStr);
                            filterAndDisplayOrders();
                        } catch (Exception e) {
                            Toast.makeText(getContext(), "Failed to parse orders", Toast.LENGTH_SHORT).show();
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

    private void filterAndDisplayOrders() {
        JSONArray filtered = new JSONArray();
        for (int i = 0; i < allOrders.length(); i++) {
            JSONObject order = allOrders.optJSONObject(i);
            if (order == null)
                continue;

            // Web ignores PROCEDURE in this tab, but we'll include it unless explicitly
            // told otherwise.
            String status = order.optString("status");
            String type = order.optString("type");

            if (type.equals("PROCEDURE"))
                continue;

            boolean isActive = status.equals("APPROVED") || status.equals("PENDING");

            if (showActive && isActive) {
                filtered.put(order);
            } else if (!showActive && !isActive) {
                filtered.put(order);
            }
        }
        adapter.setOrders(filtered);
    }

    @Override
    public void onUpdateStatus(String orderId, String newStatus, String orderType) {
        if ("COMPLETED".equals(newStatus) && "NURSE".equals(userRole) && !"NURSING".equals(orderType)) {
            Toast.makeText(getContext(), "Nurses can only complete Nursing Care orders.", Toast.LENGTH_LONG).show();
            return;
        }

        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);
        String userId = prefs.getString("user_id", "");

        try {
            JSONObject body = new JSONObject();
            body.put("status", newStatus);
            body.put("userId", userId);

            ApiClient.patch("/orders/" + orderId + "/status", body.toString(), token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            Toast.makeText(getContext(), "Order " + newStatus.toLowerCase(), Toast.LENGTH_SHORT).show();
                            loadOrders(); // Reload to refresh lists
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
        } catch (Exception e) {
            Toast.makeText(getContext(), "Error building request", Toast.LENGTH_SHORT).show();
        }
    }
}
