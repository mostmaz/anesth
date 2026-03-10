package com.icumanager.app.ui.admin;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.Spinner;
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

import java.util.ArrayList;
import java.util.List;

public class UserManagementFragment extends Fragment {

    private EditText editName, editUsername, editPassword;
    private Spinner spinnerRole;
    private Button btnCreate;
    private RecyclerView recyclerView;
    private UserAdapter adapter;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
            @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate(R.layout.fragment_user_management, container, false);

        editName = view.findViewById(R.id.editUserName);
        editUsername = view.findViewById(R.id.editUserUsername);
        editPassword = view.findViewById(R.id.editUserPassword);
        spinnerRole = view.findViewById(R.id.spinnerUserRole);
        btnCreate = view.findViewById(R.id.btnAddUser);
        recyclerView = view.findViewById(R.id.recyclerViewUsers);

        String[] roles = new String[] { "NURSE", "RESIDENT", "SENIOR" };
        spinnerRole
                .setAdapter(new ArrayAdapter<>(requireContext(), android.R.layout.simple_spinner_dropdown_item, roles));

        recyclerView.setLayoutManager(new LinearLayoutManager(getContext()));
        adapter = new UserAdapter();
        recyclerView.setAdapter(adapter);

        btnCreate.setOnClickListener(v -> createUser());

        loadUsers();

        return view;
    }

    private void loadUsers() {
        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        ApiClient.get("/users", token, new ApiClient.ApiCallback() {
            @Override
            public void onSuccess(String responseStr) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(() -> {
                        try {
                            JSONArray array = new JSONArray(responseStr);
                            adapter.setUsers(array);
                        } catch (Exception e) {
                            Toast.makeText(getContext(), "Error parsing users", Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }

            @Override
            public void onError(Exception error) {
                if (getActivity() != null) {
                    getActivity().runOnUiThread(
                            () -> Toast.makeText(getContext(), "Failed to load users", Toast.LENGTH_SHORT).show());
                }
            }
        });
    }

    private void createUser() {
        String name = editName.getText().toString().trim();
        String user = editUsername.getText().toString().trim();
        String pass = editPassword.getText().toString().trim();
        String role = spinnerRole.getSelectedItem().toString();

        if (name.isEmpty() || user.isEmpty() || pass.isEmpty()) {
            Toast.makeText(getContext(), "All fields are required", Toast.LENGTH_SHORT).show();
            return;
        }

        SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        String token = prefs.getString("auth_token", null);

        try {
            JSONObject body = new JSONObject();
            body.put("name", name);
            body.put("username", user);
            body.put("password", pass);
            body.put("role", role);

            ApiClient.post("/users", body, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            Toast.makeText(getContext(), "User created", Toast.LENGTH_SHORT).show();
                            editName.setText("");
                            editUsername.setText("");
                            editPassword.setText("");
                            loadUsers();
                        });
                    }
                }

                @Override
                public void onError(Exception error) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(
                                () -> Toast.makeText(getContext(), "Failed to create user", Toast.LENGTH_SHORT).show());
                    }
                }
            });
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private class UserAdapter extends RecyclerView.Adapter<UserAdapter.ViewHolder> {
        private JSONArray users = new JSONArray();

        public void setUsers(JSONArray users) {
            this.users = users;
            notifyDataSetChanged();
        }

        @NonNull
        @Override
        public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
            return new ViewHolder(LayoutInflater.from(parent.getContext()).inflate(R.layout.item_user, parent, false));
        }

        @Override
        public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
            JSONObject u = users.optJSONObject(position);
            if (u == null)
                return;

            holder.name.setText(u.optString("name"));
            holder.username.setText(u.optString("username"));
            holder.role.setText(u.optString("role"));

            holder.delete.setOnClickListener(v -> deleteUser(u.optString("id")));
        }

        @Override
        public int getItemCount() {
            return users.length();
        }

        private void deleteUser(String id) {
            SharedPreferences prefs = requireActivity().getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
            String token = prefs.getString("auth_token", null);

            ApiClient.delete("/users/" + id, token, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(String response) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            Toast.makeText(getContext(), "User deleted", Toast.LENGTH_SHORT).show();
                            loadUsers();
                        });
                    }
                }

                @Override
                public void onError(Exception error) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(
                                () -> Toast.makeText(getContext(), "Failed to delete user", Toast.LENGTH_SHORT).show());
                    }
                }
            });
        }

        class ViewHolder extends RecyclerView.ViewHolder {
            TextView name, username, role;
            ImageButton delete;

            ViewHolder(View v) {
                super(v);
                name = v.findViewById(R.id.textUserName);
                username = v.findViewById(R.id.textUserUsername);
                role = v.findViewById(R.id.textUserRole);
                delete = v.findViewById(R.id.btnDeleteUser);
            }
        }
    }
}
