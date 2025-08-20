import { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
  Row,
  Typography,
  Button,
  Input,
  Col,
  Select,
  Switch,
  ColorPicker,
  notification,
  Space,
  Divider
} from 'antd';
import { getLocal, setLocal } from '../../services/dbService';
import { countryConfigurations } from '../../constants/ebay-overlay-options';
import { PagesLayout } from '../../components/shared/pagesLayout';

const { Title, Text } = Typography;

const useStyles = makeStyles({
  mainDiv: {
    width: '100%',
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px'
  },
  section: {
    backgroundColor: 'white',
    padding: '20px',
    marginBottom: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  bannerPreview: {
    padding: '15px',
    marginTop: '10px',
    borderRadius: '4px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '500'
  },
  sectionItem: {
    border: '1px solid #d9d9d9',
    borderRadius: '4px',
    padding: '15px',
    marginBottom: '10px',
    backgroundColor: '#fafafa'
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: '12px',
    marginTop: '4px'
  }
});

const ListingSetup = () => {
  const classes = useStyles();
  
  const [selectedCountry, setSelectedCountry] = useState('USA');
  const [bannerColor, setBannerColor] = useState('#1677ff');
  const [bannerTextColor, setBannerTextColor] = useState('#ffffff');
  const [sections, setSections] = useState([]);
  const [listingText, setListingText] = useState('');
  const [useCustomizations, setUseCustomizations] = useState(false);
  const [errors, setErrors] = useState({});

  // Load saved data on component mount
  useEffect(() => {
    loadSavedData();
  }, []);

  // Load data when country changes
  useEffect(() => {
    loadCountryData();
  }, [selectedCountry]);

  const loadSavedData = async () => {
    const savedCountry = await getLocal('listing-setup-country') || 'USA';
    const savedBannerColor = await getLocal('listing-setup-banner-color') || '#1677ff';
    const savedBannerTextColor = await getLocal('listing-setup-banner-text-color') || '#ffffff';
    const savedUseCustomizations = await getLocal('listing-setup-use-customizations') || false;

    setSelectedCountry(savedCountry);
    setBannerColor(savedBannerColor);
    setBannerTextColor(savedBannerTextColor);
    setUseCustomizations(savedUseCustomizations);
  };

  const loadCountryData = async () => {
    // Fallback country configurations in case the import fails
    const fallbackConfigs = {
      USA: {
        defaultSections: [
          { title: 'Shipping', text: 'Fast and reliable shipping to all 50 states' },
          { title: 'Returns', text: '30-day return policy with full refund' },
          { title: 'Contact Us', text: 'We\'re here to help with any questions' },
          { title: 'Payment', text: 'We accept all major credit cards and PayPal' },
          { title: 'Feedback', text: 'Your feedback helps us improve our service' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Thank you for Supporting this American Family Run Business!'
      },
      UK: {
        defaultSections: [
          { title: 'Delivery', text: 'Fast and reliable delivery across the UK' },
          { title: 'Returns', text: '30-day return policy with full refund' },
          { title: 'Contact Us', text: 'We\'re here to help with any questions' },
          { title: 'Payment', text: 'We accept all major credit cards and PayPal' },
          { title: 'Feedback', text: 'Your feedback helps us improve our service' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Thank you for Supporting this British Family Run Business!'
      },
      Germany: {
        defaultSections: [
          { title: 'Versand', text: 'Schneller und zuverlässiger Versand in ganz Deutschland' },
          { title: 'Rückgabe', text: '30-tägige Rückgabepolitik mit vollständiger Rückerstattung' },
          { title: 'Kontakt', text: 'Wir sind hier, um bei Fragen zu helfen' },
          { title: 'Zahlung', text: 'Wir akzeptieren alle gängigen Kreditkarten und PayPal' },
          { title: 'Bewertung', text: 'Ihr Feedback hilft uns, unseren Service zu verbessern' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Vielen Dank für die Unterstützung dieses deutschen Familienunternehmens!'
      },
      France: {
        defaultSections: [
          { title: 'Livraison', text: 'Livraison rapide et fiable dans toute la France' },
          { title: 'Retours', text: 'Politique de retour de 30 jours avec remboursement complet' },
          { title: 'Contact', text: 'Nous sommes là pour vous aider avec vos questions' },
          { title: 'Paiement', text: 'Nous acceptons toutes les cartes de crédit et PayPal' },
          { title: 'Avis', text: 'Vos avis nous aident à améliorer notre service' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Merci de soutenir cette entreprise familiale française!'
      },
      Italy: {
        defaultSections: [
          { title: 'Spedizione', text: 'Spedizione veloce e affidabile in tutta Italia' },
          { title: 'Resi', text: 'Politica di reso di 30 giorni con rimborso completo' },
          { title: 'Contatti', text: 'Siamo qui per aiutarvi con le vostre domande' },
          { title: 'Pagamento', text: 'Accettiamo tutte le carte di credito e PayPal' },
          { title: 'Feedback', text: 'Il vostro feedback ci aiuta a migliorare il nostro servizio' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Grazie per sostenere questa azienda familiare italiana!'
      },
      Spain: {
        defaultSections: [
          { title: 'Envío', text: 'Envío rápido y confiable en toda España' },
          { title: 'Devoluciones', text: 'Política de devolución de 30 días con reembolso completo' },
          { title: 'Contacto', text: 'Estamos aquí para ayudarte con tus preguntas' },
          { title: 'Pago', text: 'Aceptamos todas las tarjetas de crédito y PayPal' },
          { title: 'Opiniones', text: 'Tus opiniones nos ayudan a mejorar nuestro servicio' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: '¡Gracias por apoyar este negocio familiar español!'
      },
      Australia: {
        defaultSections: [
          { title: 'Shipping', text: 'Fast and reliable shipping across Australia' },
          { title: 'Returns', text: '30-day return policy with full refund' },
          { title: 'Contact Us', text: 'We\'re here to help with any questions' },
          { title: 'Payment', text: 'We accept all major credit cards and PayPal' },
          { title: 'Feedback', text: 'Your feedback helps us improve our service' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Thank you for Supporting this Australian Family Run Business!'
      },
      Canada: {
        defaultSections: [
          { title: 'Shipping', text: 'Fast and reliable shipping across Canada' },
          { title: 'Returns', text: '30-day return policy with full refund' },
          { title: 'Contact Us', text: 'We\'re here to help with any questions' },
          { title: 'Payment', text: 'We accept all major credit cards and PayPal' },
          { title: 'Feedback', text: 'Your feedback helps us improve our service' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Thank you for Supporting this Canadian Family Run Business!'
      }
    };

    const countryConfig = countryConfigurations?.[selectedCountry] || fallbackConfigs[selectedCountry];
    if (!countryConfig) return;

    // Load saved sections for this country or use defaults
    const savedSections = await getLocal(`listing-setup-sections-${selectedCountry}`);
    const savedListingText = await getLocal(`listing-setup-text-${selectedCountry}`);

    setSections(savedSections || [...countryConfig.defaultSections]);
    setListingText(savedListingText || countryConfig.listingText);
  };

  const handleCountryChange = async (value) => {
    setSelectedCountry(value);
    await setLocal('listing-setup-country', value);
    setErrors({});
  };

  const handleSectionChange = (index, field, value) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], [field]: value };
    setSections(newSections);

    // Clear error for this section
    if (errors[`section-${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`section-${index}`];
      setErrors(newErrors);
    }
  };

  const handleSave = async () => {
    // Validate sections
    const newErrors = {};
    sections.forEach((section, index) => {
      if (section.text && !section.title) {
        newErrors[`section-${index}`] = 'Title is required when text is provided';
      }
      if (section.title && section.title.length > 20) {
        newErrors[`section-${index}`] = 'Title must be 20 characters or less';
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      notification.error({
        message: 'Validation Error',
        description: 'Please fix the errors before saving.'
      });
      return;
    }

    // Save data
    await setLocal(`listing-setup-sections-${selectedCountry}`, sections);
    await setLocal(`listing-setup-text-${selectedCountry}`, listingText);
    await setLocal('listing-setup-banner-color', bannerColor);
    await setLocal('listing-setup-banner-text-color', bannerTextColor);
    await setLocal('listing-setup-use-customizations', useCustomizations);

    // Get country name for success message
    const countryNames = {
      USA: 'United States',
      UK: 'United Kingdom',
      Germany: 'Germany',
      France: 'France',
      Italy: 'Italy',
      Spain: 'Spain',
      Australia: 'Australia',
      Canada: 'Canada'
    };

    notification.success({
      message: 'Saved Successfully',
      description: `Listing setup for ${countryNames[selectedCountry]} has been saved.`
    });
  };

  const handleResetToDefaults = async () => {
    // Use fallback configurations if countryConfigurations is not available
    const fallbackConfigs = {
      USA: {
        defaultSections: [
          { title: 'Shipping', text: 'Fast and reliable shipping to all 50 states' },
          { title: 'Returns', text: '30-day return policy with full refund' },
          { title: 'Contact Us', text: 'We\'re here to help with any questions' },
          { title: 'Payment', text: 'We accept all major credit cards and PayPal' },
          { title: 'Feedback', text: 'Your feedback helps us improve our service' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Thank you for Supporting this American Family Run Business!'
      },
      UK: {
        defaultSections: [
          { title: 'Delivery', text: 'Fast and reliable delivery across the UK' },
          { title: 'Returns', text: '30-day return policy with full refund' },
          { title: 'Contact Us', text: 'We\'re here to help with any questions' },
          { title: 'Payment', text: 'We accept all major credit cards and PayPal' },
          { title: 'Feedback', text: 'Your feedback helps us improve our service' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Thank you for Supporting this British Family Run Business!'
      },
      Germany: {
        defaultSections: [
          { title: 'Versand', text: 'Schneller und zuverlässiger Versand in ganz Deutschland' },
          { title: 'Rückgabe', text: '30-tägige Rückgabepolitik mit vollständiger Rückerstattung' },
          { title: 'Kontakt', text: 'Wir sind hier, um bei Fragen zu helfen' },
          { title: 'Zahlung', text: 'Wir akzeptieren alle gängigen Kreditkarten und PayPal' },
          { title: 'Bewertung', text: 'Ihr Feedback hilft uns, unseren Service zu verbessern' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Vielen Dank für die Unterstützung dieses deutschen Familienunternehmens!'
      },
      France: {
        defaultSections: [
          { title: 'Livraison', text: 'Livraison rapide et fiable dans toute la France' },
          { title: 'Retours', text: 'Politique de retour de 30 jours avec remboursement complet' },
          { title: 'Contact', text: 'Nous sommes là pour vous aider avec vos questions' },
          { title: 'Paiement', text: 'Nous acceptons toutes les cartes de crédit et PayPal' },
          { title: 'Avis', text: 'Vos avis nous aident à améliorer notre service' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Merci de soutenir cette entreprise familiale française!'
      },
      Italy: {
        defaultSections: [
          { title: 'Spedizione', text: 'Spedizione veloce e affidabile in tutta Italia' },
          { title: 'Resi', text: 'Politica di reso di 30 giorni con rimborso completo' },
          { title: 'Contatti', text: 'Siamo qui per aiutarvi con le vostre domande' },
          { title: 'Pagamento', text: 'Accettiamo tutte le carte di credito e PayPal' },
          { title: 'Feedback', text: 'Il vostro feedback ci aiuta a migliorare il nostro servizio' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Grazie per sostenere questa azienda familiare italiana!'
      },
      Spain: {
        defaultSections: [
          { title: 'Envío', text: 'Envío rápido y confiable en toda España' },
          { title: 'Devoluciones', text: 'Política de devolución de 30 días con reembolso completo' },
          { title: 'Contacto', text: 'Estamos aquí para ayudarte con tus preguntas' },
          { title: 'Pago', text: 'Aceptamos todas las tarjetas de crédito y PayPal' },
          { title: 'Opiniones', text: 'Tus opiniones nos ayudan a mejorar nuestro servicio' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: '¡Gracias por apoyar este negocio familiar español!'
      },
      Australia: {
        defaultSections: [
          { title: 'Shipping', text: 'Fast and reliable shipping across Australia' },
          { title: 'Returns', text: '30-day return policy with full refund' },
          { title: 'Contact Us', text: 'We\'re here to help with any questions' },
          { title: 'Payment', text: 'We accept all major credit cards and PayPal' },
          { title: 'Feedback', text: 'Your feedback helps us improve our service' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Thank you for Supporting this Australian Family Run Business!'
      },
      Canada: {
        defaultSections: [
          { title: 'Shipping', text: 'Fast and reliable shipping across Canada' },
          { title: 'Returns', text: '30-day return policy with full refund' },
          { title: 'Contact Us', text: 'We\'re here to help with any questions' },
          { title: 'Payment', text: 'We accept all major credit cards and PayPal' },
          { title: 'Feedback', text: 'Your feedback helps us improve our service' },
          { title: '', text: '' },
          { title: '', text: '' }
        ],
        listingText: 'Thank you for Supporting this Canadian Family Run Business!'
      }
    };

    const countryConfig = countryConfigurations?.[selectedCountry] || fallbackConfigs[selectedCountry];
    setSections([...countryConfig.defaultSections]);
    setListingText(countryConfig.listingText);
    setErrors({});

    const countryNames = {
      USA: 'United States',
      UK: 'United Kingdom',
      Germany: 'Germany',
      France: 'France',
      Italy: 'Italy',
      Spain: 'Spain',
      Australia: 'Australia',
      Canada: 'Canada'
    };

    notification.success({
      message: 'Reset to Defaults',
      description: `Settings for ${countryNames[selectedCountry]} have been reset to defaults.`
    });
  };

  const handleUpdateAllListings = async () => {
    // This would integrate with the existing listing update functionality
    notification.info({
      message: 'Update All Listings',
      description: 'This feature will update all current listings with the new settings. Implementation pending.'
    });
  };

  const getBannerPreviewStyle = () => ({
    backgroundColor: bannerColor,
    color: bannerTextColor,
    padding: '15px',
    marginTop: '10px',
    borderRadius: '4px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '500'
  });

  // Hardcoded country options to ensure all countries are available
  const countryOptions = [
    { label: 'United States', value: 'USA' },
    { label: 'United Kingdom', value: 'UK' },
    { label: 'Germany', value: 'Germany' },
    { label: 'France', value: 'France' },
    { label: 'Italy', value: 'Italy' },
    { label: 'Spain', value: 'Spain' },
    { label: 'Australia', value: 'Australia' },
    { label: 'Canada', value: 'Canada' }
  ];

  return (
    <PagesLayout>
      <div className={classes.mainDiv}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: '30px' }}>
        Listing Setup
      </Title>

      {/* Country Selection */}
      <div className={classes.section}>
        <Title level={4}>Country Selection</Title>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <Text strong>eBay Country:</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              value={selectedCountry}
              onChange={handleCountryChange}
              options={countryOptions}
              placeholder="Select eBay country"
            />
          </Col>
          <Col span={12}>
            <Text type="secondary">
              Choose the eBay country you sell in to customize your listings with the correct terminology and rules.
            </Text>
          </Col>
        </Row>
      </div>

      {/* Banner Customization */}
      <div className={classes.section}>
        <Title level={4}>Banner Customization</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Text strong>Banner Color:</Text>
            <div style={{ marginTop: '8px' }}>
              <ColorPicker
                value={bannerColor}
                onChange={(color) => setBannerColor(color.toHexString())}
                showText
              />
            </div>
          </Col>
          <Col span={8}>
            <Text strong>Text Color:</Text>
            <div style={{ marginTop: '8px' }}>
              <ColorPicker
                value={bannerTextColor}
                onChange={(color) => setBannerTextColor(color.toHexString())}
                showText
              />
            </div>
          </Col>
          <Col span={8}>
            <Text strong>Preview:</Text>
            <div style={getBannerPreviewStyle()}>
              Sample Banner Text
            </div>
          </Col>
        </Row>
      </div>

      {/* Customizable Sections */}
      <div className={classes.section}>
        <Title level={4}>Customizable Sections</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: '15px' }}>
          Customize up to 7 sections for your listings. Leave fields blank if you don't want to use them.
        </Text>
        
        {sections.map((section, index) => (
          <div key={index} className={classes.sectionItem}>
            <Row gutter={16}>
              <Col span={8}>
                <Text strong>Title ({section.title?.length || 0}/20):</Text>
                <Input
                  placeholder="Section title (e.g., Shipping, Returns)"
                  value={section.title}
                  onChange={(e) => handleSectionChange(index, 'title', e.target.value)}
                  maxLength={20}
                  style={{ marginTop: '4px' }}
                />
              </Col>
              <Col span={16}>
                <Text strong>Text:</Text>
                <Input.TextArea
                  placeholder="Section content"
                  value={section.text}
                  onChange={(e) => handleSectionChange(index, 'text', e.target.value)}
                  rows={3}
                  style={{ marginTop: '4px' }}
                />
              </Col>
            </Row>
            {errors[`section-${index}`] && (
              <Text className={classes.errorText}>{errors[`section-${index}`]}</Text>
            )}
          </div>
        ))}
      </div>

      {/* Listing Text */}
      <div className={classes.section}>
        <Title level={4}>Listing Text</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: '10px' }}>
          Add text at the bottom of each listing:
        </Text>
        <Input.TextArea
          placeholder="Enter listing text"
          value={listingText}
          onChange={(e) => setListingText(e.target.value)}
          rows={4}
        />
      </div>

      {/* Settings */}
      <div className={classes.section}>
        <Title level={4}>Settings</Title>
        <Row gutter={16} align="middle" style={{ marginBottom: '15px' }}>
          <Col span={16}>
            <Text strong>Use Customizations for Listings</Text>
            <br />
            <Text type="secondary">Enable to apply these customizations to your listings</Text>
          </Col>
          <Col span={8}>
            <Switch
              checked={useCustomizations}
              onChange={setUseCustomizations}
            />
          </Col>
        </Row>
      </div>

      {/* Action Buttons */}
      <div className={classes.section}>
        <Title level={4}>Actions</Title>
        <Space size="middle">
          <Button type="primary" onClick={handleSave}>
            Save Settings
          </Button>
          <Button onClick={handleResetToDefaults}>
            Reset to Defaults
          </Button>
          <Button onClick={handleUpdateAllListings}>
            Update All Listings
          </Button>
        </Space>
      </div>

      <Divider />

      <div style={{ textAlign: 'center', color: '#666' }}>
        <Text>
          Configure your eBay listings to match the specific requirements and terminology of each country's eBay platform.
        </Text>
      </div>
      </div>
    </PagesLayout>
  );
};

export default ListingSetup; 