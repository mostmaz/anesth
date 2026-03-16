package com.icumanager.app.ui.patient;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentActivity;
import androidx.viewpager2.adapter.FragmentStateAdapter;

import java.util.ArrayList;
import java.util.List;

public class PatientPagerAdapter extends FragmentStateAdapter {

    private final List<TabEntry> tabs = new ArrayList<>();

    /** Holds a tab title and the fragment to show for that tab */
    private static class TabEntry {
        final String title;
        final Fragment fragment;

        TabEntry(String title, Fragment fragment) {
            this.title = title;
            this.fragment = fragment;
        }
    }

    /**
     * @param fragmentActivity host activity
     * @param patientId        patient UUID
     * @param role             "SENIOR" | "RESIDENT" | "NURSE"
     */
    public PatientPagerAdapter(@NonNull FragmentActivity fragmentActivity,
            String patientId,
            String role) {
        super(fragmentActivity);

        boolean isNurse = "NURSE".equalsIgnoreCase(role);

        // Tab 0 — always visible
        tabs.add(new TabEntry("Overview", OverviewFragment.newInstance(patientId)));

        // Tab 1 — always visible
        tabs.add(new TabEntry("Vitals", VitalsFragment.newInstance(patientId)));

        // Tab 3 — always visible
        tabs.add(new TabEntry("MAR", MedicationsFragment.newInstance(patientId)));

        // Tab 4 — always visible
        tabs.add(new TabEntry("I/O", IoFragment.newInstance(patientId)));

        // Tab 5 — always visible
        tabs.add(new TabEntry("Labs", InvestigationsFragment.newInstance(patientId, "LAB")));

        // Tab 6 — hidden from NURSE
        if (!isNurse) {
            tabs.add(new TabEntry("Radiology", InvestigationsFragment.newInstance(patientId, "IMAGING")));
        }

        // Tab 7 — hidden from NURSE
        if (!isNurse) {
            tabs.add(new TabEntry("Cardiology", InvestigationsFragment.newInstance(patientId, "CARDIOLOGY")));
        }

        // Tab 8 — always visible
        tabs.add(new TabEntry("Interventions", InterventionsFragment.newInstance(patientId)));

        // Tab 9 — always visible
        tabs.add(new TabEntry("Notes", NotesFragment.newInstance(patientId)));

        // Tab 10 — always visible
        tabs.add(new TabEntry("Ventilator", VentilatorFragment.newInstance(patientId)));

        // Tab 11 — always visible
        tabs.add(new TabEntry("Orders", OrdersFragment.newInstance(patientId)));

        // Tab 12 — hidden from NURSE
        if (!isNurse) {
            tabs.add(new TabEntry("Consults", ConsultationFragment.newInstance(patientId)));
        }

        // Tab 13 — always visible
        tabs.add(new TabEntry("Nursing", NursingFragment.newInstance(patientId)));
    }

    @NonNull
    @Override
    public Fragment createFragment(int position) {
        return tabs.get(position).fragment;
    }

    @Override
    public int getItemCount() {
        return tabs.size();
    }

    /** Returns the tab title for the given position (used by TabLayoutMediator) */
    public String getTabTitle(int position) {
        return tabs.get(position).title;
    }
}
