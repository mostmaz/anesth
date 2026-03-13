package com.icumanager.app.ui.auth;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.icumanager.app.R;
import com.icumanager.app.network.ApiClient;
import org.json.JSONException;
import org.json.JSONObject;

public class LoginActivity extends AppCompatActivity {

    private TextInputEditText editUsername;
    private TextInputEditText editPassword;
    private MaterialButton buttonSignIn;
    private ProgressBar progressBar;
    private TextView textError;

    // Runtime permission launcher for POST_NOTIFICATIONS (Android 13+)
    private final ActivityResultLauncher<String> notificationPermLauncher =
            registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
                // We continue regardless — notifications may be suppressed if denied
            });

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_login);

        editUsername = findViewById(R.id.editUsername);
        editPassword = findViewById(R.id.editPassword);
        buttonSignIn = findViewById(R.id.buttonSignIn);
        progressBar = findViewById(R.id.progressBar);
        textError = findViewById(R.id.textError);

        buttonSignIn.setOnClickListener(v -> attemptLogin());

        // Request POST_NOTIFICATIONS permission on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                notificationPermLauncher.launch(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
    }

    private void attemptLogin() {
        String username = editUsername.getText().toString().trim();
        String password = editPassword.getText().toString().trim();

        if (username.isEmpty() || password.isEmpty()) {
            showError("Please enter both username and password");
            return;
        }

        setLoading(true);

        try {
            JSONObject payload = new JSONObject();
            payload.put("username", username);
            payload.put("password", password);

            ApiClient.post("/auth/login", payload, null, new ApiClient.ApiCallback() {
                @Override
                public void onSuccess(final String responseStr) {
                    runOnUiThread(() -> {
                        setLoading(false);
                        try {
                            JSONObject response = new JSONObject(responseStr);
                            String token = response.getString("token");

                            // Extract user details from response
                            String userId = "";
                            String userRole = "";
                            if (response.has("user")) {
                                JSONObject user = response.getJSONObject("user");
                                userId   = user.optString("id", user.optString("_id", ""));
                                userRole = user.optString("role", "");
                            } else {
                                // Some backends return fields at the top level
                                userId   = response.optString("id", response.optString("_id", ""));
                                userRole = response.optString("role", "");
                            }

                            saveSession(token, userId, userRole);
                            Toast.makeText(LoginActivity.this, "Login Successful", Toast.LENGTH_SHORT).show();
                            Intent intent = new Intent(LoginActivity.this,
                                    com.icumanager.app.ui.dashboard.DashboardActivity.class);
                            startActivity(intent);
                            finish();
                        } catch (JSONException e) {
                            showError("Invalid server response format");
                        }
                    });
                }

                @Override
                public void onError(final Exception error) {
                    runOnUiThread(() -> {
                        setLoading(false);
                        showError(error.getMessage());
                    });
                }
            });

        } catch (JSONException e) {
            setLoading(false);
            showError("Failed to build request");
        }
    }

    private void saveSession(String token, String userId, String userRole) {
        SharedPreferences prefs = getSharedPreferences("ICU_PREFS", Context.MODE_PRIVATE);
        prefs.edit()
                .putString("auth_token", token)
                .putString("user_id", userId)
                .putString("user_role", userRole)
                .apply();
    }

    private void setLoading(boolean isLoading) {
        buttonSignIn.setEnabled(!isLoading);
        progressBar.setVisibility(isLoading ? View.VISIBLE : View.GONE);
        if (isLoading) {
            textError.setVisibility(View.GONE);
        }
    }

    private void showError(String message) {
        textError.setText(message);
        textError.setTextColor(0xFFEF4444); // Red
        textError.setVisibility(View.VISIBLE);
    }
}
