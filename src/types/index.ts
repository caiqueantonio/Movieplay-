export type ClientStatus = 'Em dia' | 'Vencendo (7d)' | 'Em atraso' | 'Pendente' | 'Suspenso' | 'Cancelado';

export interface Client {
  id: string;
  // 18 Colunas Obrigatórias da Planilha:
  nome: string;          // 1. Nome
  email: string;         // 2. Email
  whatsapp: string;      // 3. WhatsApp
  celular: string;       // 4. Celular
  aparelho: string;      // 5. Aparelho
  mac: string;           // 6. MAC
  senhaMac: string;      // 7. Senha MAC
  servidor: string;      // 8. Servidor
  aplicativo: string;    // 9. Aplicativo
  usuarioDisp: string;   // 10. Usuário Disp.
  senhaDisp: string;     // 11. Senha Disp.
  appPago: boolean;      // 12. App Pago (Sim / Não)
  appPagoStatus?: 'recebido' | 'pendente'; // Status do pagamento do app pago
  validadeApp: string;   // 13. Validade App
  plano: string;         // 14. Plano (Mensal, Trimestral, Semestral, Anual, etc.)
  vencimento: string;    // 15. Vencimento (YYYY-MM-DD ou DD/MM/YYYY)
  status: ClientStatus;  // 16. Status
  valor: number;         // 17. Valor (ex: 20.00)
  observacoes: string;   // 18. Observações
  
  // Metadados internos
  fotoUrl?: string;      // Foto personalizada do cliente (data URL persistente)
  dataNascimento?: string; // Data de nascimento do cliente (YYYY-MM-DD ou DD/MM/AAAA)
  arquivado?: boolean;   // Se o cliente expirado foi arquivado (pasta inativos)
  createdAt?: string;
  updatedAt?: string;
  ultimoPagamento?: string;
  historico?: ClientHistoryEntry[];
}

export interface ClientHistoryEntry {
  id: string;
  data: string;
  acao: string;
  descricao: string;
  usuario: string;
}

export interface ServerItem {
  id: string;
  nome: string;
  descricao: string;
  status: 'ativo' | 'inativo';
  linkAcesso?: string; // URL / Link para redirecionar ao servidor
  logoUrl?: string;    // Imagem do servidor para fácil reconhecimento visual
  corTema?: string;    // Cor de destaque
  observacoes?: string;
  createdAt: string;
}

export interface ServerDeposit {
  id: string;
  servidorId: string;
  servidorNome: string;
  data: string; // YYYY-MM-DD ou DD/MM/AAAA
  valor: number; // Valor depositado/recarregado no servidor
  periodo: 'mensal' | 'semanal' | 'quinzenal' | 'avulso';
  observacoes?: string;
  createdAt?: string;
}

export interface PlanItem {
  id: string;
  nome: string;
  duracaoMeses: number;
  valorPadrao: number;
  linkCobranca: string;
  chavePix: string;
  status: 'ativo' | 'inativo';
  descricao?: string;
}

export type PaymentMethodType = 'pix_aleatoria' | 'pix_celular' | 'mercadopago' | 'dinheiro' | 'cartao' | 'outro';

export interface PaymentMethodItem {
  id: string;
  nome: string;
  tipo: PaymentMethodType;
  chaveOuLink: string;
  beneficiario?: string;
  bancoRecebedor?: string;
  ativo: boolean;
  isDefault?: boolean;
  descricao?: string;
}

export type MessageCategory = 
  | 'cobranca_mensal' 
  | 'cobranca_semestral' 
  | 'cobranca_anual' 
  | 'aviso_pix' 
  | 'lembrete_vencimento' 
  | 'aviso_atraso' 
  | 'confirmacao_pagamento'
  | string;

export interface MessageTemplate {
  id: string;
  nome: string;
  categoria: MessageCategory;
  categoriaNome: string;
  plano: string; // 'Todos' | 'Mensal' | 'Semestral' | 'Anual' | etc.
  formaPagamentoId: string; // id de PaymentMethodItem ou 'padrao'
  conteudo: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentStatus = 'rascunho' | 'pendente' | 'aguardando' | 'pago' | 'vencido' | 'cancelado' | 'estornado';
export type PaymentMethod = 'pix' | 'mercadopago' | 'cartao' | 'dinheiro' | 'outro';

export interface PaymentRecord {
  id: string;
  clienteId: string;
  clienteNome: string;
  planoNome: string;
  valorOriginal: number;
  desconto: number;
  valorFinal: number;
  dataCriacao: string;
  dataVencimento: string;
  formaPagamento: PaymentMethod;
  status: PaymentStatus;
  transacaoId?: string;
  mpPreferenceId?: string;
  mpPaymentId?: string;
  dataConfirmacao?: string;
  observacoes?: string;
  chavePixUtilizada?: string;
  linkPagamento?: string;
}

export interface AutomationRule {
  id: string;
  tipo: 'vencimento_proximo' | 'dia_vencimento' | 'atraso' | 'pagamento_confirmado' | 'renovacao';
  titulo: string;
  dias: number; // ex: -3 (3 dias antes), 0 (no dia), 2 (2 dias de atraso)
  ativo: boolean;
  mensagemTemplate: string;
}

export interface NotificationLog {
  id: string;
  data: string;
  clienteId: string;
  clienteNome: string;
  clienteWhatsapp: string;
  tipo: string;
  status: 'enviado' | 'pendente' | 'falha';
  mensagem: string;
}

export interface AppNotification {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'info' | 'alerta' | 'sucesso' | 'erro';
  data: string;
  lida: boolean;
  link?: string;
}

export interface BillingConfig {
  chavePix: string;
  tipoChavePix: 'cpf_cnpj' | 'email' | 'celular' | 'aleatoria';
  beneficiario: string;
  bancoRecebedor?: string;
  linkPagamento: string;
  descricao: string;
  instrucoes: string;
  mensagemCobrancaTemplate: string;
}

export interface AlertScheduleConfig {
  aviso7Dias: boolean;
  aviso3Dias: boolean;
  aviso1Dia: boolean;
  avisoNoDia: boolean;
  avisoAposVencimento: boolean;
  intervaloAtrasoDias: number; // ex: a cada 2 dias durante atraso
  horarioEnvio: string;        // ex: '09:00'
  pushEnabled: boolean;
}

export interface AppSettings {
  appName: string;
  appSubtitle: string;
  logoUrl: string;
  theme: 'dark' | 'light';
  soundAlert: 'beep' | 'sino' | 'urgente' | 'digital';
  soundEnabled: boolean;
  primaryColor: string;
  adminWhatsapp: string;
  contatoUrl: string;
  mpAccessToken: string;
  mpPublicKey: string;
  mpSandbox: boolean;
  diasTolerancia: number;
  billingConfig?: BillingConfig;
  alertSchedule?: AlertScheduleConfig;
}

export interface UserAccount {
  id: string;
  nome: string;
  email: string;
  role: 'admin' | 'operador';
  avatar?: string;
  provider?: 'google' | 'local';
}
