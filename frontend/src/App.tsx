import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Shield, 
  FileText, 
  AlertTriangle, 
  ListTodo, 
  MessageSquare, 
  Send, 
  Languages, 
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2
} from 'lucide-react';
import './i18n'; // import i18n config

interface Message {
  id: string;
  sender: 'user' | 'companion';
  text: string;
  confidence?: number;
  sources?: string[];
}

interface Complaint {
  _id: string;
  title: string;
  description: string;
  category: string;
  location: { latitude: number; longitude: number };
  status: 'Pending' | 'In Progress' | 'Resolved';
  updates: Array<{ status: string; updatedAt: string; note?: string }>;
  createdAt: string;
}

interface PublicService {
  id: string;
  title: string;
  description: string;
  complexText: string;
}

const SAMPLE_SERVICES: PublicService[] = [
  {
    id: "serv-1",
    title: "Commercial Business Permit",
    description: "Approval required to conduct any commercial activity within municipal zoning.",
    complexText: "Pursuant to Article IX, Section 4.2 of the municipal code, no corporation, partnership, or individual entity shall engage in retail, wholesale, or light manufacturing operations without obtaining a duly authorized certificate of commercial compliance. The application requires documentation of title, architectural blueprints, environmental runoff assessments, and local taxation clearance certifications."
  },
  {
    id: "serv-2",
    title: "Residential Building Extension",
    description: "Application guidelines for modifying or extending existing residential properties.",
    complexText: "Any structure modification exceeding a volumetric index of 15 cubic meters or increasing the foundation footprint by 5% requires a structural compliance verification review. Applicants must submit structural calculations certified by an engineer, detailed boundary offsets, and neighborhood consent affidavits under the local zoning protection act."
  },
  {
    id: "serv-3",
    title: "Water Service Connection",
    description: "Utility lines installation request protocol for residential housing units.",
    complexText: "Requests for new primary domestic water service taps require verification of property connection fees, structural alignment blueprints showing proximity to municipal water distribution networks, and conformity to chemical sanitation testing protocols before main valving initiation."
  }
];

export default function App() {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'services' | 'report' | 'track' | 'companion'>('services');
  const [citizenId, setCitizenId] = useState<string>('');
  
  // Translation state
  const [currentLang, setCurrentLang] = useState<string>('en');

  // AI Chat States
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Issue Reporter States
  const [reportTitle, setReportTitle] = useState<string>('');
  const [reportDesc, setReportDesc] = useState<string>('');
  const [reportCategory, setReportCategory] = useState<string>('');
  const [reportLat, setReportLat] = useState<string>('12.9716');
  const [reportLng, setReportLng] = useState<string>('77.5946');
  const [reportStatusMsg, setReportStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);

  // Complaints state
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [trackerLoading, setTrackerLoading] = useState<boolean>(false);

  // Document simplification state
  const [simplifyingId, setSimplifyingId] = useState<string | null>(null);
  const [simplifiedDocs, setSimplifiedDocs] = useState<Record<string, { summary: string; requirements: string[] }>>({});

  // Initialize Citizen session on component mount
  useEffect(() => {
    const initializeCitizenSession = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferredLanguage: currentLang })
        });
        if (response.ok) {
          const user = await response.json();
          setCitizenId(user._id);
        }
      } catch (err) {
        console.error("Failed to generate citizen session:", err);
      }
    };
    initializeCitizenSession();
  }, []);

  // Fetch Complaints
  const fetchComplaints = async () => {
    if (!citizenId) return;
    setTrackerLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/complaints?citizenId=${citizenId}`);
      if (response.ok) {
        const data = await response.json();
        setComplaints(data);
      }
    } catch (err) {
      console.error("Failed to fetch complaints list:", err);
    } finally {
      setTrackerLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'track') {
      fetchComplaints();
    }
  }, [activeTab, citizenId]);

  // Toggle Language
  const toggleLanguage = () => {
    const nextLang = currentLang === 'en' ? 'hi' : 'en';
    setCurrentLang(nextLang);
    i18n.changeLanguage(nextLang);
  };

  // Simplify Document handler
  const handleSimplifyDocument = async (service: PublicService) => {
    setSimplifyingId(service.id);
    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Simplify this government service document: "${service.complexText}". Break down key points and list required files/documents.`,
          language: currentLang
        })
      });
      if (response.ok) {
        const data = await response.json();
        
        // Treat RAG/LLM formatted outputs or map mock fallback fields
        const summary = data.answer || "Failed to simplify.";
        const requirements = data.sources || ["Original Document Verification", "Local Residency Proof"];
        
        setSimplifiedDocs(prev => ({
          ...prev,
          [service.id]: { summary, requirements }
        }));
      }
    } catch (err) {
      console.error("Failed to simplify:", err);
    } finally {
      setSimplifyingId(null);
    }
  };

  // Submit Complaint handler
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenId || !reportTitle || !reportDesc || !reportCategory) {
      setReportStatusMsg({ type: 'error', text: t('reporter.error') });
      return;
    }
    setSubmitLoading(true);
    setReportStatusMsg(null);
    try {
      const response = await fetch('http://localhost:5000/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          citizenId,
          title: reportTitle,
          description: reportDesc,
          category: reportCategory,
          location: {
            latitude: parseFloat(reportLat) || 0,
            longitude: parseFloat(reportLng) || 0
          }
        })
      });
      if (response.ok) {
        setReportStatusMsg({ type: 'success', text: t('reporter.success') });
        setReportTitle('');
        setReportDesc('');
        setReportCategory('');
      } else {
        setReportStatusMsg({ type: 'error', text: t('reporter.error') });
      }
    } catch (err) {
      setReportStatusMsg({ type: 'error', text: t('reporter.error') });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Get current location handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setReportStatusMsg({ type: 'error', text: t('reporter.location_error') });
      return;
    }
    setLocating(true);
    setReportStatusMsg(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setReportLat(position.coords.latitude.toFixed(6));
        setReportLng(position.coords.longitude.toFixed(6));
        setLocating(false);
      },
      (error) => {
        console.error("Error getting location: ", error);
        setReportStatusMsg({ type: 'error', text: t('reporter.location_error') });
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Send Chat Message handler
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsgText = chatInput;
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: userMsgText
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMsgText,
          language: currentLang
        })
      });
      if (response.ok) {
        const data = await response.json();
        const companionMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'companion',
          text: data.answer,
          confidence: data.confidence_score,
          sources: data.sources
        };
        setChatMessages(prev => [...prev, companionMsg]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'companion',
          text: currentLang === 'en' ? "Failed to communicate with AI model companion." : "AI साथी से संपर्क करने में असमर्थ।"
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div>
      {/* Header element */}
      <header className="app-header" role="banner">
        <div className="brand">
          <Shield className="focus-ring" size={28} style={{ color: 'var(--accent-secondary)' }} aria-hidden="true" />
          <h1>{t('app.title')}</h1>
        </div>

        <nav role="navigation" aria-label="Main Navigation">
          <div className="nav-links">
            <button 
              className={`nav-btn ${activeTab === 'services' ? 'active' : ''}`}
              onClick={() => setActiveTab('services')}
              aria-current={activeTab === 'services' ? 'page' : undefined}
            >
              {t('nav.services')}
            </button>
            <button 
              className={`nav-btn ${activeTab === 'report' ? 'active' : ''}`}
              onClick={() => setActiveTab('report')}
              aria-current={activeTab === 'report' ? 'page' : undefined}
            >
              {t('nav.report')}
            </button>
            <button 
              className={`nav-btn ${activeTab === 'track' ? 'active' : ''}`}
              onClick={() => setActiveTab('track')}
              aria-current={activeTab === 'track' ? 'page' : undefined}
            >
              {t('nav.track')}
            </button>
            <button 
              className={`nav-btn ${activeTab === 'companion' ? 'active' : ''}`}
              onClick={() => setActiveTab('companion')}
              aria-current={activeTab === 'companion' ? 'page' : undefined}
            >
              {t('nav.companion')}
            </button>

            <button 
              onClick={toggleLanguage} 
              className="lang-toggle"
              aria-label={`Switch language to ${currentLang === 'en' ? 'Hindi' : 'English'}`}
            >
              <Languages size={16} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
              {currentLang === 'en' ? 'हिन्दी' : 'English'}
            </button>
          </div>
        </nav>
      </header>

      {/* Main body wrapper */}
      <main className="app-container" id="main-content">
        <section className="hero">
          <h2>{t('app.title')}</h2>
          <p>{t('app.subtitle')}</p>
        </section>

        {/* Tab 1: Services Directory */}
        {activeTab === 'services' && (
          <section aria-labelledby="services-heading">
            <h2 id="services-heading" className="sr-only">{t('nav.services')}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{t('services.description')}</p>
            
            <div className="card-grid">
              {SAMPLE_SERVICES.map(service => (
                <article key={service.id} className="glass-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <FileText size={20} style={{ color: 'var(--accent-secondary)' }} />
                    <h3>{service.title}</h3>
                  </div>
                  <p>{service.description}</p>
                  
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>MUNICIPAL CLAUSE Snippet:</strong>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic' }}>{service.complexText}</p>
                  </div>

                  {simplifiedDocs[service.id] && (
                    <div style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.2)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', animation: 'fadeIn 0.5s ease' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-secondary)', marginBottom: '0.5rem' }}>
                        <Sparkles size={16} />
                        <strong style={{ fontSize: '0.9rem' }}>AI Simplification Summary</strong>
                      </div>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>{simplifiedDocs[service.id].summary}</p>
                      
                      <strong style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>REQUIRED COMPANION DOCUMENT CHECKLIST:</strong>
                      <ul style={{ fontSize: '0.85rem', paddingLeft: '1.25rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
                        {simplifiedDocs[service.id].requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button 
                    onClick={() => handleSimplifyDocument(service)}
                    disabled={simplifyingId === service.id}
                    className="btn-submit"
                    style={{ fontSize: '0.9rem', padding: '0.6rem' }}
                  >
                    {simplifyingId === service.id ? t('services.loading') : t('services.simplify_btn')}
                  </button>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Tab 2: Issue Reporter Form */}
        {activeTab === 'report' && (
          <section aria-labelledby="report-heading" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <AlertTriangle size={24} style={{ color: 'var(--warning)' }} />
                <h2 id="report-heading" style={{ fontSize: '1.4rem' }}>{t('reporter.title')}</h2>
              </div>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>{t('reporter.desc')}</p>

              {reportStatusMsg && (
                <div 
                  role="status" 
                  style={{ 
                    padding: '0.8rem 1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1.25rem', 
                    background: reportStatusMsg.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${reportStatusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
                    color: reportStatusMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
                    fontSize: '0.9rem'
                  }}
                >
                  {reportStatusMsg.text}
                </div>
              )}

              <form onSubmit={handleReportSubmit}>
                <div className="form-group">
                  <label htmlFor="title">{t('reporter.form_title')}</label>
                  <input 
                    id="title"
                    type="text" 
                    value={reportTitle} 
                    onChange={e => setReportTitle(e.target.value)} 
                    placeholder="e.g. Broken streetlight on 4th cross" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">{t('reporter.form_desc')}</label>
                  <textarea 
                    id="description" 
                    rows={4}
                    value={reportDesc} 
                    onChange={e => setReportDesc(e.target.value)} 
                    placeholder="Provide details about the issue location or impact"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">{t('reporter.form_category')}</label>
                  <select 
                    id="category" 
                    value={reportCategory} 
                    onChange={e => setReportCategory(e.target.value)} 
                    required
                  >
                    <option value="">{t('reporter.categories.select')}</option>
                    <option value="Sanitation">{t('reporter.categories.sanitation')}</option>
                    <option value="Infrastructure">{t('reporter.categories.infra')}</option>
                    <option value="Utilities">{t('reporter.categories.utility')}</option>
                    <option value="Other">{t('reporter.categories.other')}</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={locating}
                  className="btn-submit focus-ring"
                  style={{
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.4)',
                    color: 'var(--accent-secondary)',
                    marginBottom: '1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.95rem',
                    padding: '0.75rem',
                    width: '100%',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.2)';
                    e.currentTarget.style.borderColor = 'var(--accent-secondary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(6, 182, 212, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)';
                  }}
                >
                  <MapPin size={16} />
                  {locating ? t('reporter.getting_location') : t('reporter.get_location')}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="lat">{t('reporter.form_lat')}</label>
                    <input 
                      id="lat"
                      type="text" 
                      value={reportLat} 
                      onChange={e => setReportLat(e.target.value)} 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lng">{t('reporter.form_lng')}</label>
                    <input 
                      id="lng"
                      type="text" 
                      value={reportLng} 
                      onChange={e => setReportLng(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <button type="submit" disabled={submitLoading} className="btn-submit">
                  {submitLoading ? "Submitting..." : t('reporter.submit')}
                </button>
              </form>
            </div>
          </section>
        )}

        {/* Tab 3: Tracker Dashboard */}
        {activeTab === 'track' && (
          <section aria-labelledby="tracker-heading">
            <div className="glass-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <ListTodo size={24} style={{ color: 'var(--accent-secondary)' }} />
                <h2 id="tracker-heading" style={{ fontSize: '1.4rem' }}>{t('tracker.title')}</h2>
              </div>

              {trackerLoading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Retrieving submitted logs...</p>
              ) : complaints.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>{t('tracker.empty')}</p>
              ) : (
                <div className="table-container">
                  <table className="custom-table" role="table" aria-label="Complaints log table">
                    <thead>
                      <tr>
                        <th scope="col">{t('tracker.id')}</th>
                        <th scope="col">Title</th>
                        <th scope="col">Category</th>
                        <th scope="col">{t('tracker.status')}</th>
                        <th scope="col">{t('tracker.date')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {complaints.map(complaint => (
                        <tr key={complaint._id}>
                          <td style={{ fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--accent-secondary)' }}>
                            {complaint._id}
                          </td>
                          <td style={{ fontWeight: '500' }}>{complaint.title}</td>
                          <td>{complaint.category}</td>
                          <td>
                            <span className={`status-badge ${complaint.status.toLowerCase().replace(' ', '')}`}>
                              {t(`tracker.${complaint.status.toLowerCase().replace(' ', '')}`)}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            {new Date(complaint.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Tab 4: AI Companion Dialog Interface */}
        {activeTab === 'companion' && (
          <section aria-labelledby="companion-heading" className="ai-companion-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <MessageSquare size={24} style={{ color: 'var(--accent-secondary)' }} />
              <h2 id="companion-heading" style={{ fontSize: '1.4rem' }}>{t('companion.title')}</h2>
            </div>

            <div 
              className="chat-box" 
              role="log" 
              aria-live="polite" 
              aria-label="Civic Companion chat log"
            >
              <div className="chat-bubble companion" aria-label="Companion: Greeting">
                <p>{t('companion.welcome')}</p>
              </div>

              {chatMessages.map(msg => (
                <div key={msg.id} className={`chat-bubble ${msg.sender}`} aria-label={`${msg.sender === 'user' ? 'You' : 'Companion'}: ${msg.text}`}>
                  <p>{msg.text}</p>
                  {msg.sender === 'companion' && (msg.confidence !== undefined || (msg.sources && msg.sources.length > 0)) && (
                    <div className="meta-info">
                      {msg.confidence !== undefined && (
                        <span>
                          <CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          {t('companion.confidence')}: {(msg.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                      {msg.sources && msg.sources.length > 0 && (
                        <span>
                          <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                          {t('companion.sources')}: {msg.sources.join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {chatLoading && (
                <div className="chat-bubble companion" role="status" aria-live="assertive">
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <span style={{ animation: 'fadeIn 1s infinite alternate' }}>●</span>
                    <span style={{ animation: 'fadeIn 1s infinite alternate 0.2s' }}>●</span>
                    <span style={{ animation: 'fadeIn 1s infinite alternate 0.4s' }}>●</span>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendChatMessage} className="chat-input-bar">
              <label htmlFor="companion-query-input" className="sr-only">
                {t('companion.placeholder')}
              </label>
              <input
                id="companion-query-input"
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder={t('companion.placeholder')}
                disabled={chatLoading}
                aria-required="true"
                required
              />
              <button type="submit" disabled={chatLoading || !chatInput.trim()} className="btn-submit">
                <Send size={18} />
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}
