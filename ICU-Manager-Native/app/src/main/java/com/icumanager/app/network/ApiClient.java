package com.icumanager.app.network;

import android.util.Log;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ApiClient {
    private static final String BASE_URL = "http://161.35.216.33:3001/api";
    private static final ExecutorService executor = Executors.newFixedThreadPool(4);

    public interface ApiCallback {
        void onSuccess(String response);

        void onError(Exception error);
    }

    public static void post(String endpoint, JSONObject payload, String token, ApiCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(BASE_URL + endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setRequestProperty("Accept", "application/json");
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                }
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                byte[] input = payload.toString().getBytes("utf-8");
                conn.setRequestProperty("Content-Length", String.valueOf(input.length));

                try (OutputStream os = conn.getOutputStream()) {
                    os.write(input, 0, input.length);
                    os.flush();
                }

                int status = conn.getResponseCode();
                BufferedReader in;
                if (status >= 200 && status < 300) {
                    in = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"));
                } else {
                    in = new BufferedReader(new InputStreamReader(conn.getErrorStream(), "utf-8"));
                }

                StringBuilder responseStr = new StringBuilder();
                String inputLine;
                while ((inputLine = in.readLine()) != null) {
                    responseStr.append(inputLine);
                }
                in.close();

                if (status >= 200 && status < 300) {
                    callback.onSuccess(responseStr.toString());
                } else {
                    callback.onError(new Exception("API Error " + status + ": " + responseStr.toString()));
                }

            } catch (Exception e) {
                Log.e("ApiClient", "Network Request Failed", e);
                callback.onError(e);
            }
        });
    }

    public static void get(String endpoint, String token, ApiCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(BASE_URL + endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setRequestProperty("Accept", "application/json");
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                }
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                int status = conn.getResponseCode();
                BufferedReader in;
                if (status >= 200 && status < 300) {
                    in = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"));
                } else {
                    in = new BufferedReader(new InputStreamReader(conn.getErrorStream(), "utf-8"));
                }

                StringBuilder responseStr = new StringBuilder();
                String inputLine;
                while ((inputLine = in.readLine()) != null) {
                    responseStr.append(inputLine);
                }
                in.close();

                if (status >= 200 && status < 300) {
                    callback.onSuccess(responseStr.toString());
                } else {
                    callback.onError(new Exception("API Error " + status + ": " + responseStr.toString()));
                }

            } catch (Exception e) {
                Log.e("ApiClient", "GET Request Failed", e);
                callback.onError(e);
            }
        });
    }

    public static void patch(String endpoint, String jsonBody, String token, ApiCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(BASE_URL + endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("PATCH");
                conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
                conn.setRequestProperty("Accept", "application/json");
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                }
                conn.setDoOutput(true);
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);

                byte[] input = jsonBody.getBytes("utf-8");
                conn.setRequestProperty("Content-Length", String.valueOf(input.length));
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(input, 0, input.length);
                    os.flush();
                }

                int status = conn.getResponseCode();
                BufferedReader in;
                if (status >= 200 && status < 300) {
                    in = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"));
                } else {
                    in = new BufferedReader(new InputStreamReader(conn.getErrorStream(), "utf-8"));
                }
                StringBuilder responseStr = new StringBuilder();
                String line;
                while ((line = in.readLine()) != null)
                    responseStr.append(line);
                in.close();

                if (status >= 200 && status < 300) {
                    callback.onSuccess(responseStr.toString());
                } else {
                    callback.onError(new Exception("API Error " + status + ": " + responseStr));
                }
            } catch (Exception e) {
                Log.e("ApiClient", "PATCH Request Failed", e);
                callback.onError(e);
            }
        });
    }

    public static void uploadFile(String endpoint, byte[] fileData, String fileName, String token,
            ApiCallback callback) {
        executor.execute(() -> {
            try {
                URL url = new URL(BASE_URL + endpoint);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                if (token != null && !token.isEmpty()) {
                    conn.setRequestProperty("Authorization", "Bearer " + token);
                }
                String boundary = "*****" + System.currentTimeMillis() + "*****";
                conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
                conn.setDoOutput(true);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(30000);

                try (OutputStream os = conn.getOutputStream()) {
                    // Start boundary
                    os.write(("--" + boundary + "\r\n").getBytes("utf-8"));
                    // Content disposition header (make sure name matches server expectation
                    // 'files')
                    os.write(("Content-Disposition: form-data; name=\"files\"; filename=\"" + fileName + "\"\r\n")
                            .getBytes("utf-8"));
                    // Assume jpeg for now, can be generic application/octet-stream if needed
                    os.write(("Content-Type: image/jpeg\r\n\r\n").getBytes("utf-8"));

                    // File data
                    os.write(fileData);

                    // End boundary
                    os.write(("\r\n--" + boundary + "--\r\n").getBytes("utf-8"));
                    os.flush();
                }

                int status = conn.getResponseCode();
                BufferedReader in;
                if (status >= 200 && status < 300) {
                    in = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"));
                } else {
                    in = new BufferedReader(new InputStreamReader(conn.getErrorStream(), "utf-8"));
                }

                StringBuilder responseStr = new StringBuilder();
                String inputLine;
                while ((inputLine = in.readLine()) != null) {
                    responseStr.append(inputLine);
                }
                in.close();

                if (status >= 200 && status < 300) {
                    callback.onSuccess(responseStr.toString());
                } else {
                    callback.onError(new Exception("API Error " + status + ": " + responseStr.toString()));
                }

            } catch (Exception e) {
                Log.e("ApiClient", "Upload Request Failed", e);
                callback.onError(e);
            }
        });
    }
}
