import api from '../lib/api';
import i18n from '../i18n/config';

/**
 * Get WhatsApp message template (user's personal message or global default)
 */
export async function getWhatsAppMessage(): Promise<string> {
  // Use translated default message based on current language
  let message = i18n.t('whatsapp.defaultMessage');
  
  try {
    const userResponse = await api.get<{
      success: true;
      data: {
        id: string;
        username: string;
        role: string;
        whatsappMessage?: string | null;
      };
    }>('/auth/me');
    
    if (userResponse.data.data?.whatsappMessage) {
      message = userResponse.data.data.whatsappMessage;
    } else {
      try {
        const configResponse = await api.get<{
          success: true;
          data: { value: string };
        }>('/config/whatsapp_default_message');
        
        if (configResponse.data.data?.value) {
          message = configResponse.data.data.value;
        }
      } catch (configError) {
        console.warn('Failed to load global WhatsApp message config, using default');
      }
    }
  } catch (userError) {
    try {
      const configResponse = await api.get<{
        success: true;
        data: { value: string };
      }>('/config/whatsapp_default_message');
      
      if (configResponse.data.data?.value) {
        message = configResponse.data.data.value;
      }
    } catch (configError) {
      console.warn('Failed to load WhatsApp message config, using default');
    }
  }

  return message;
}

/**
 * Open WhatsApp with message
 */
export async function openWhatsApp(phone: string, message: string): Promise<void> {
  const normalizedPhone = phone.replace(/\D/g, '');
  const whatsappUrl = `https://api.whatsapp.com/send/?phone=${normalizedPhone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;

  if (window.electron?.openExternal) {
    await window.electron.openExternal(whatsappUrl);
  } else {
    window.open(whatsappUrl, '_blank');
  }
}

