import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Bell,
  UserPlus,
  Check,
  X,
  Clock,
  AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

interface Invitation {
  id: string;
  inviter_id: string;
  patient_id: string;
  phone_number: string;
  role: string;
  role_description: string;
  status: string;
  expires_at: string;
  created_at: string;
  inviter: {
    full_name: string;
  };
}

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const isRTL = language === 'ar';

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('invitations')
        .select(
          `
          *,
          inviter:profiles!inviter_id(full_name)
        `
        )
        .eq('phone_number', profile?.phone_number)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setInvitations(data || []);
    } catch (error: any) {
      console.error('Error loading invitations:', error);
      Alert.alert(t.common.error, error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAcceptInvitation = async (invitation: Invitation) => {
    try {
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          invited_user_id: profile?.id,
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      if (invitation.patient_id) {
        const { error: teamError } = await supabase.from('patient_team').insert({
          patient_id: invitation.patient_id,
          user_id: profile?.id,
          role: invitation.role,
        });

        if (teamError) throw teamError;
      }

      Alert.alert(
        t.common.success,
        language === 'ar'
          ? 'تم قبول الدعوة بنجاح'
          : 'Invitation accepted successfully'
      );

      loadInvitations();
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({
          status: 'rejected',
        })
        .eq('id', invitationId);

      if (error) throw error;

      Alert.alert(
        t.common.success,
        language === 'ar'
          ? 'تم رفض الدعوة'
          : 'Invitation rejected'
      );

      loadInvitations();
    } catch (error: any) {
      Alert.alert(t.common.error, error.message);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'accepted':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'expired':
        return '#8E8E93';
      default:
        return '#666666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t.common.pending;
      case 'accepted':
        return t.common.accepted;
      case 'rejected':
        return t.common.rejected;
      case 'expired':
        return language === 'ar' ? 'منتهية' : 'Expired';
      default:
        return status;
    }
  };

  const getRoleLabel = (role: string) => {
    const roleLabels: Record<string, { ar: string; en: string }> = {
      doctor: { ar: 'طبيب', en: 'Doctor' },
      primary_caregiver: { ar: 'مرافق رئيسي', en: 'Primary Caregiver' },
      backup_caregiver: { ar: 'مرافق احتياطي', en: 'Backup Caregiver' },
      cupper: { ar: 'حجام', en: 'Cupper' },
      patient: { ar: 'مريض', en: 'Patient' },
      patient_getting_cupping: { ar: 'متحجّم', en: 'Getting Cupping' },
    };

    return roleLabels[role]?.[language === 'ar' ? 'ar' : 'en'] || role;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const pendingInvitations = invitations.filter(
    (inv) => inv.status === 'pending' && !isExpired(inv.expires_at)
  );
  const pastInvitations = invitations.filter(
    (inv) => inv.status !== 'pending' || isExpired(inv.expires_at)
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Bell size={28} color="#007AFF" />
        <Text style={[styles.title, isRTL && styles.rtl]}>
          {t.common.invitations}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {pendingInvitations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
              {language === 'ar' ? 'الدعوات الجديدة' : 'New Invitations'}
            </Text>

            {pendingInvitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationCard}>
                <View style={styles.invitationHeader}>
                  <View style={styles.iconContainer}>
                    <UserPlus size={24} color="#007AFF" />
                  </View>
                  <View style={styles.invitationInfo}>
                    <Text style={[styles.inviterName, isRTL && styles.rtl]}>
                      {invitation.inviter?.full_name}
                    </Text>
                    <View style={styles.roleTag}>
                      <Text style={styles.roleText}>
                        {getRoleLabel(invitation.role)}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.description, isRTL && styles.rtl]}>
                  {invitation.role_description}
                </Text>

                <View style={styles.invitationFooter}>
                  <View style={styles.timeContainer}>
                    <Clock size={14} color="#8E8E93" />
                    <Text style={styles.timeText}>
                      {new Date(invitation.created_at).toLocaleDateString(
                        language === 'ar' ? 'ar-SA' : 'en-US'
                      )}
                    </Text>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRejectInvitation(invitation.id)}
                    >
                      <X size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>
                        {language === 'ar' ? 'رفض' : 'Reject'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAcceptInvitation(invitation)}
                    >
                      <Check size={18} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>
                        {language === 'ar' ? 'قبول' : 'Accept'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {pastInvitations.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.rtl]}>
              {language === 'ar' ? 'الدعوات السابقة' : 'Past Invitations'}
            </Text>

            {pastInvitations.map((invitation) => {
              const expired = isExpired(invitation.expires_at);
              const displayStatus = expired ? 'expired' : invitation.status;

              return (
                <View key={invitation.id} style={styles.pastInvitationCard}>
                  <View style={styles.invitationHeader}>
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: getStatusColor(displayStatus) + '20' },
                      ]}
                    >
                      <UserPlus size={24} color={getStatusColor(displayStatus)} />
                    </View>
                    <View style={styles.invitationInfo}>
                      <Text style={[styles.inviterName, isRTL && styles.rtl]}>
                        {invitation.inviter?.full_name}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(displayStatus) },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {getStatusLabel(displayStatus)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.pastDescription, isRTL && styles.rtl]}>
                    {invitation.role_description}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {invitations.length === 0 && (
          <View style={styles.emptyContainer}>
            <AlertCircle size={48} color="#8E8E93" />
            <Text style={[styles.emptyText, isRTL && styles.rtl]}>
              {language === 'ar'
                ? 'لا توجد دعوات'
                : 'No invitations'}
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  rtl: {
    textAlign: 'right',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  invitationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  inviterName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  roleTag: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  invitationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pastInvitationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    opacity: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pastDescription: {
    fontSize: 13,
    color: '#666666',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
});
