package com.icumanager.app.models;

public class VentilatorSetting {
    private String id;
    private String patientId;
    private String userId;

    private String mode;
    private int rate;
    private int fio2;
    private String ie;
    private int ps;
    private int vt;

    // Some endpoints may return timestamp
    private String timestamp;

    // Constructors
    public VentilatorSetting() {
    }

    public VentilatorSetting(String patientId, String userId, String mode, int rate, int fio2, String ie, int ps,
            int vt, String timestamp) {
        this.patientId = patientId;
        this.userId = userId;
        this.mode = mode;
        this.rate = rate;
        this.fio2 = fio2;
        this.ie = ie;
        this.ps = ps;
        this.vt = vt;
        this.timestamp = timestamp;
    }

    // Getters
    public String getId() {
        return id;
    }

    public String getPatientId() {
        return patientId;
    }

    public String getUserId() {
        return userId;
    }

    public String getMode() {
        return mode;
    }

    public int getRate() {
        return rate;
    }

    public int getFio2() {
        return fio2;
    }

    public String getIe() {
        return ie;
    }

    public int getPs() {
        return ps;
    }

    public int getVt() {
        return vt;
    }

    public String getTimestamp() {
        return timestamp;
    }

    // Setters
    public void setId(String id) {
        this.id = id;
    }

    public void setPatientId(String patientId) {
        this.patientId = patientId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public void setRate(int rate) {
        this.rate = rate;
    }

    public void setFio2(int fio2) {
        this.fio2 = fio2;
    }

    public void setIe(String ie) {
        this.ie = ie;
    }

    public void setPs(int ps) {
        this.ps = ps;
    }

    public void setVt(int vt) {
        this.vt = vt;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
}
