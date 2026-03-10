package com.icumanager.app.ui.admin;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.URLEncoder;

public class DrugCatalogFragment extends Fragment {

    private EditText editName, editDose, editRoute, editSearch;
    private Button btnAdd;
    private RecyclerView recyclerView;
    private DrugAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_drug_catalog, container, false);

        editName = view.findViewById(R.id.editDrugName);
        editDose = view.findViewById(R.id.editDrugDose);
        editRoute = view.findViewById(R.id.editDrugRoute);
        editSearch = view.findViewById(R.id.editCatalogSearch);
        btnAdd = view.findViewById(R.id.btnAddDrug);
        recyclerView = view.findViewById(R.id.recyclerViewCatalog);

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new DrugAdapter();
        recyclerView.setAdapter(adapter);

        btnAdd.setOnClickListener(v -> addDrug());

        editSearch.addTextChangedListener(new TextWatcher() {
            @Override
            public void beforeTextChanged(CharSequence s, int start, int count, int after) {
            }

            @Override
            public void onTextChanged(CharSequence s, int start, int before, int count) {
                loadCatalog(s.toString());
            }

            @Override
            public void afterTextChanged(Editable s) {
            }
        });

        loadCatalog("");

        return view;
    }

    private void loadCatalog(String query) {
        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        String endpoint = "/medications/catalog";
        if (!query.isEmpty()) {
            try {
                endpoint += "?q=" + URLEncoder.encode(query, "UTF-8");
            } catch (Exception ignored) {
            }
        }

        ApiClient.get(endpoint, token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            JSONArray array = new JSONArray(responseStr);
                            adapter.setDrugs(array);
                        } catch (Exception e) {
                            Toast.makeText(getContext(), "Error parsing catalog", Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(
                            () -> Toast.makeText(getContext(), "Failed to load catalog", Toast.LENGTH_SHORT).show());
                }
            }
        });
    }

    private void addDrug() {
        String name = editName.getText().toString().trim();
        String dose = editDose.getText().toString().trim();
        String route = editRoute.getText().toString().trim();

        if (name.isEmpty()) {
            Toast.makeText(getContext(), "Drug name is required", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        try {
            JSONObject body = new JSONObject();
            body.put("name", name);
            body.put("defaultDose", dose);
            body.put("defaultRoute", route);

            ApiClient.post("/medications/catalog", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            Toast.makeText(getContext(), "Drug added", Toast.LENGTH_SHORT).show();
                            editName.setText("");
                            editDose.setText("");
                            editRoute.setText("");
                            loadCatalog(editSearch.getText().toString());
                        });
                    }
                }

                @Override
                public void onError(Exception error) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(
                                () -> Toast.makeText(getContext(), "Failed to add drug", Toast.LENGTH_SHORT).show());
                    }
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private class DrugAdapter extends RecyclerView.Adapter<DrugAdapter.ViewHolder> {
        private JSONArray drugs = new JSONArray();

        public void setDrugs(JSONArray drugs) {
            this.drugs = drugs;
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            return new ViewHolder(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_drug, parent, false));
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            JSONObject d = drugs.optJSONObject(position);
            if (d == null)
                return;

            holder.name.setText(d.optString("name"));
            String details = (d.optString("defaultDose") + " " + d.optString("defaultRoute")).trim();
            holder.details.setText(details.isEmpty() ? "-" : details);

            holder.delete.setOnClickListener(v -> deleteDrug(d.optString("id")));
        }

        @Override
        public int getItemCount() {
            return drugs.length();
        }

        private void deleteDrug(String id) {
            SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
            String token = prefs.getString("auth_token", null);

            ApiClient.delete("/medications/catalog/" + id, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            Toast.makeText(getContext(), "Drug removed", Toast.LENGTH_SHORT).show();
                            loadCatalog(editSearch.getText().toString());
                        });
                    }
                }

                @Override
                public void onError(Exception error) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(
                                () -> Toast.makeText(getContext(), "Failed to remove drug", Toast.LENGTH_SHORT).show());
                    }
                }
            });
        }

        class ViewHolder extends RecyclerView.ViewHolder {
            TextView name, details;
            ImageButton delete;

            ViewHolder(View v) {
                super(v);
                name = v.findViewById(R.id.textDrugName);
                details = v.findViewById(R.id.textDrugDetails);
                delete = v.findViewById(R.id.btnDeleteDrug);
            }
        }
    }
}
