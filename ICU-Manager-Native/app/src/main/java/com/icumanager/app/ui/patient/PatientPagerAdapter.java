package com.icumanager.app.ui.patient;

import androidx.annotation.NonNull;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentActivity;
import androidx.viewpager2.adapter.FragmentStateAdapter;

public class PatientPagerAdapter extends FragmentStateAdapter {

    private final String patientId;

    public PatientPagerAdapter(@NonNull FragmentActivity fragmentActivity, String patientId) {
        super(fragmentActivity);
        this.patientId = patientId;
    }

    @NonNull
    @Override
    public Fragment createFragment(int position) {
        switch (position) {
            case 0:
                return OverviewFragment.newInstance(patientId);
            case 1:
                return HandoverFragment.newInstance(patientId);
            case 2:
                return VitalsFragment.newInstance(patientId);
            case 3:
                return MedicationsFragment.newInstance(patientId);
            case 4:
                return IoFragment.newInstance(patientId);
            case 5:
                return InvestigationsFragment.newInstance(patientId, "LAB");
            case 6:
                return InvestigationsFragment.newInstance(patientId, "IMAGING");
            case 7:
                return InvestigationsFragment.newInstance(patientId, "CARDIOLOGY");
            case 8:
                return InterventionsFragment.newInstance(patientId);
            case 9:
                return NotesFragment.newInstance(patientId);
            case 10:
                return VentilatorFragment.newInstance(patientId);
            case 11:
                return OrdersFragment.newInstance(patientId);
            default:
                return PlaceholderFragment.newInstance("Unknown");
        }
    }

    @Override
    public int getItemCount() {
        return 12;
    }
}
