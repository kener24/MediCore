# MediCore - Diagrama e inventario de base de datos

Generado desde los modelos Django actuales del proyecto. Refleja la estructura usada por la base de datos local y por produccion despues de aplicar migraciones.

## Resumen general

- Modelos totales Django: **51**
- Modelos funcionales MediCore: **46**
- Tablas existentes en la conexion actual: **55**

## Modulos funcionales

- **accounts**: Roles y usuarios del sistema. (2 tablas)
- **admissions**: Flujo de admision, sala de espera y triaje. (1 tablas)
- **appointments**: Citas clinicas. (1 tablas)
- **audit**: Auditoria de acciones del sistema. (1 tablas)
- **billing**: Servicios facturables, facturas, pagos y caja. (6 tablas)
- **clinic_settings**: Configuracion fiscal, operativa y documental por clinica. (1 tablas)
- **clinics**: Clinicas tenant del SaaS. (1 tablas)
- **doctors**: Especialidades, perfiles medicos y horarios. (3 tablas)
- **documents**: Categorias y documentos clinicos. (2 tablas)
- **inventory**: Categorias, productos, lotes y movimientos de inventario. (4 tablas)
- **medical_records**: Expedientes, consultas, signos vitales y consumos clinicos. (4 tablas)
- **notifications**: Notificaciones y preferencias. (2 tablas)
- **patients**: Pacientes y enlace opcional a usuario portal. (1 tablas)
- **prescriptions**: Diagnosticos, recetas y ordenes medicas. (4 tablas)
- **purchases**: Proveedores, ordenes de compra y recepciones. (5 tablas)
- **security**: Reset de password, verificacion email, sesiones, bloqueos y politicas. (6 tablas)
- **subscriptions**: Planes y suscripciones por clinica. (2 tablas)

## Diagrama ER principal

> Este diagrama incluye las tablas funcionales propias de MediCore. Las tablas internas de Django (`auth`, `admin`, `sessions`, `contenttypes`) se listan mas abajo.

```mermaid
erDiagram
  clinics_clinic {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    CharField nombre
    CharField rtn
    CharField telefono
    CharField correo
    TextField direccion
    BooleanField activo
  }
  accounts_role {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    CharField nombre UK
    TextField descripcion
    BooleanField activo
  }
  accounts_user {
    BigAutoField id PK UK
    CharField password
    DateTimeField last_login
    BooleanField is_superuser
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinica FK
    FK role FK
    CharField nombre_completo
    CharField email UK
    CharField telefono
    CharField avatar_url
    BooleanField is_active
    BooleanField is_staff
    DateTimeField ultimo_acceso
    BooleanField email_verified
    GenericIPAddressField last_login_ip
    TextField last_login_user_agent
    DateTimeField password_changed_at
    DateTimeField date_joined
  }
  doctors_medicalspecialty {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    CharField nombre UK
    TextField descripcion
    BooleanField activo
  }
  doctors_doctorprofile {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK user UK FK
    FK specialty FK
    CharField numero_colegiacion
    CharField titulo_profesional
    TextField biografia
    DecimalField tarifa_consulta
    PositiveIntegerField duracion_consulta_minutos
    BooleanField atiende_virtual
    BooleanField atiende_presencial
    BooleanField activo
  }
  doctors_doctorschedule {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK doctor FK
    CharField dia_semana
    TimeField hora_inicio
    TimeField hora_fin
    BooleanField activo
  }
  patients_patient {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK user UK FK
    CharField codigo_paciente
    CharField nombres
    CharField apellidos
    CharField nombre_completo
    CharField identidad
    DateField fecha_nacimiento
    CharField genero
    CharField tipo_sangre
    CharField telefono
    CharField correo
    TextField direccion
    CharField ciudad
    CharField departamento
    CharField pais
    CharField contacto_emergencia_nombre
    CharField contacto_emergencia_telefono
    CharField contacto_emergencia_parentesco
    TextField alergias
    TextField enfermedades_cronicas
    TextField observaciones
    BooleanField activo
  }
  appointments_appointment {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK patient FK
    FK doctor FK
    FK created_by FK
    DateField scheduled_date
    TimeField start_time
    TimeField end_time
    CharField reason
    TextField notes
    CharField status
    TextField cancellation_reason
    FK cancelled_by FK
    DateTimeField cancelled_at
    DateTimeField confirmed_at
    DateTimeField attended_at
    BooleanField activo
  }
  admissions_patientvisit {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK patient FK
    FK appointment FK
    FK medical_record FK
    FK consultation FK
    FK invoice FK
    CharField visit_number
    DateField visit_date
    DateTimeField arrival_time
    DateTimeField triage_started_at
    DateTimeField triage_completed_at
    DateTimeField consultation_started_at
    DateTimeField consultation_completed_at
    DateTimeField checkout_at
    CharField visit_type
    CharField priority
    CharField status
    CharField reason
    TextField symptoms
    TextField notes
    FK assigned_doctor FK
    FK assigned_nurse FK
    FK created_by FK
    FK checked_in_by FK
    BooleanField active
  }
  medical_records_medicalrecord {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK patient UK FK
    CharField record_number
    CharField blood_type
    TextField allergies
    TextField chronic_diseases
    TextField surgical_history
    TextField family_history
    TextField current_medications
    TextField general_notes
    BooleanField activo
  }
  medical_records_clinicalconsultation {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK medical_record FK
    FK patient FK
    FK doctor FK
    FK appointment UK FK
    FK patient_visit FK
    DateField consultation_date
    TimeField start_time
    TimeField end_time
    TextField chief_complaint
    TextField symptoms
    TextField physical_exam
    TextField clinical_assessment
    TextField preliminary_diagnosis
    TextField treatment_plan
    TextField recommendations
    TextField private_notes
    CharField status
    TextField void_reason
    FK created_by FK
    FK finalized_by FK
    DateTimeField finalized_at
    BooleanField activo
  }
  medical_records_vitalsigns {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK consultation UK FK
    FK patient_visit FK
    DecimalField temperature
    PositiveSmallIntegerField blood_pressure_systolic
    PositiveSmallIntegerField blood_pressure_diastolic
    PositiveSmallIntegerField heart_rate
    PositiveSmallIntegerField respiratory_rate
    PositiveSmallIntegerField oxygen_saturation
    DecimalField weight
    DecimalField height
    DecimalField bmi
    PositiveSmallIntegerField glucose
    PositiveSmallIntegerField pain_scale
    TextField notes
    FK registrado_por FK
    DateTimeField recorded_at
  }
  medical_records_clinicalsupplyusage {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK patient FK
    FK consultation FK
    FK appointment FK
    FK doctor FK
    FK nurse FK
    FK inventory_item FK
    FK inventory_lot FK
    DecimalField quantity
    DecimalField unit_cost
    DecimalField unit_price
    DecimalField total_price
    CharField usage_type
    CharField description
    TextField notes
    BooleanField billable
    BooleanField invoiced
    FK invoice FK
    FK invoice_item FK
    FK inventory_movement FK
    FK applied_by FK
    DateTimeField applied_at
    CharField status
    BooleanField active
  }
  prescriptions_diagnosis {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK patient FK
    FK doctor FK
    FK consultation FK
    CharField code
    CharField name
    TextField description
    CharField diagnosis_type
    BooleanField is_primary
    TextField notes
    BooleanField activo
  }
  prescriptions_prescription {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK patient FK
    FK doctor FK
    FK consultation FK
    CharField prescription_number
    DateField issue_date
    TextField general_instructions
    CharField status
    TextField void_reason
    BooleanField activo
  }
  prescriptions_prescriptionitem {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK prescription FK
    CharField medication_name
    CharField presentation
    CharField dosage
    CharField frequency
    CharField duration
    CharField quantity
    CharField route
    TextField instructions
    BooleanField activo
  }
  prescriptions_medicalorder {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK patient FK
    FK doctor FK
    FK consultation FK
    CharField order_number
    CharField order_type
    CharField title
    TextField description
    TextField instructions
    CharField priority
    CharField status
    BooleanField activo
  }
  billing_billableservice {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    CharField name
    TextField description
    CharField code
    DecimalField price
    BooleanField taxable
    DecimalField tax_rate
    BooleanField active
  }
  billing_invoice {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK patient FK
    FK appointment FK
    FK consultation FK
    CharField invoice_number
    DateField issue_date
    DateField due_date
    CharField status
    DecimalField subtotal
    DecimalField discount_amount
    DecimalField tax_amount
    DecimalField total_amount
    DecimalField paid_amount
    DecimalField balance_due
    TextField notes
    FK created_by FK
    FK cancelled_by FK
    DateTimeField cancelled_at
    TextField cancellation_reason
    BooleanField active
  }
  billing_invoiceitem {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK invoice FK
    CharField item_type
    FK service FK
    FK inventory_item FK
    FK inventory_lot FK
    FK related_consultation FK
    FK related_consumption FK
    FK inventory_movement FK
    CharField description
    DecimalField quantity
    DecimalField unit_price
    DecimalField discount_amount
    DecimalField tax_rate
    DecimalField tax_amount
    DecimalField line_total
    BooleanField active
  }
  billing_cashsession {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK opened_by FK
    FK closed_by FK
    DateTimeField opening_datetime
    DateTimeField closing_datetime
    DecimalField opening_amount
    DecimalField closing_amount
    DecimalField expected_amount
    DecimalField difference_amount
    CharField status
    TextField notes
    BooleanField active
  }
  billing_payment {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK invoice FK
    FK patient FK
    FK cash_session FK
    CharField payment_number
    DateField payment_date
    DecimalField amount
    CharField method
    CharField reference
    TextField notes
    CharField status
    FK received_by FK
    FK cancelled_by FK
    DateTimeField cancelled_at
    TextField cancellation_reason
    BooleanField active
  }
  billing_cashmovement {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK cash_session FK
    CharField movement_type
    DecimalField amount
    CharField reason
    TextField notes
    FK created_by FK
    BooleanField active
  }
  inventory_inventorycategory {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    CharField name
    TextField description
    BooleanField active
  }
  inventory_inventoryitem {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK category FK
    CharField name
    TextField description
    CharField sku
    CharField barcode
    CharField item_type
    CharField unit
    CharField presentation
    DecimalField cost_price
    DecimalField sale_price
    DecimalField stock_current
    DecimalField stock_minimum
    DecimalField stock_maximum
    BooleanField requires_lot
    BooleanField requires_expiration
    BooleanField active
  }
  inventory_inventorylot {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK item FK
    CharField lot_number
    DateField expiration_date
    DecimalField quantity_current
    DecimalField cost_price
    DateField received_date
    BooleanField active
  }
  inventory_inventorymovement {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK item FK
    FK lot FK
    CharField movement_type
    DecimalField quantity
    DecimalField unit_cost
    CharField reason
    CharField reference_type
    CharField reference_id
    TextField notes
    FK performed_by FK
    BooleanField active
  }
  purchases_supplier {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    CharField name
    CharField rtn
    CharField contact_name
    CharField phone
    CharField email
    TextField address
    CharField city
    CharField country
    TextField notes
    BooleanField active
  }
  purchases_purchaseorder {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK supplier FK
    CharField order_number
    DateField order_date
    DateField expected_date
    CharField status
    DecimalField subtotal
    DecimalField discount_amount
    DecimalField tax_amount
    DecimalField total_amount
    TextField notes
    FK created_by FK
    FK approved_by FK
    DateTimeField approved_at
    FK cancelled_by FK
    DateTimeField cancelled_at
    TextField cancellation_reason
    BooleanField active
  }
  purchases_purchaseorderitem {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK purchase_order FK
    FK item FK
    CharField description
    DecimalField quantity_ordered
    DecimalField quantity_received
    DecimalField unit_cost
    DecimalField discount_amount
    DecimalField tax_rate
    DecimalField tax_amount
    DecimalField line_total
    BooleanField active
  }
  purchases_purchasereceipt {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK purchase_order FK
    CharField receipt_number
    DateField receipt_date
    FK received_by FK
    TextField notes
    BooleanField active
  }
  purchases_purchasereceiptitem {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK receipt FK
    FK purchase_order_item FK
    FK item FK
    FK lot FK
    DecimalField quantity_received
    DecimalField unit_cost
    CharField lot_number
    DateField expiration_date
    TextField notes
    FK inventory_movement FK
    BooleanField active
  }
  audit_auditlog {
    BigAutoField id PK UK
    FK clinic FK
    FK user FK
    CharField action
    CharField module
    CharField model_name
    CharField object_id
    CharField object_repr
    TextField description
    CharField severity
    GenericIPAddressField ip_address
    TextField user_agent
    CharField request_method
    CharField request_path
    JSONField old_values
    JSONField new_values
    JSONField metadata
    DateTimeField created_at
  }
  notifications_notification {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK recipient FK
    CharField title
    TextField message
    CharField notification_type
    CharField module
    CharField priority
    CharField status
    CharField related_model
    CharField related_object_id
    CharField action_url
    DateTimeField read_at
    DateTimeField sent_at
    DateTimeField expires_at
    JSONField metadata
  }
  notifications_notificationpreference {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK user UK FK
    BooleanField receive_appointment_reminders
    BooleanField receive_billing_alerts
    BooleanField receive_inventory_alerts
    BooleanField receive_purchase_alerts
    BooleanField receive_audit_alerts
    BooleanField receive_system_notifications
    BooleanField email_enabled
    BooleanField sms_enabled
    BooleanField whatsapp_enabled
    BooleanField push_enabled
  }
  clinic_settings_clinicsettings {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic UK FK
    CharField logo_url
    CharField primary_color
    CharField secondary_color
    CharField accent_color
    CharField currency
    CharField country
    CharField timezone
    CharField language
    BooleanField tax_enabled
    DecimalField default_tax_rate
    CharField invoice_prefix
    CharField patient_prefix
    CharField medical_record_prefix
    CharField prescription_prefix
    CharField medical_order_prefix
    CharField purchase_order_prefix
    PositiveIntegerField appointment_duration_minutes
    BooleanField allow_online_appointments
    BooleanField allow_patient_cancellations
    PositiveIntegerField cancellation_hours_limit
    BooleanField require_appointment_confirmation
    BooleanField allow_patient_portal
    BooleanField allow_patient_medical_record_view
    BooleanField allow_patient_prescription_view
    BooleanField allow_patient_invoice_view
    TimeField business_start_time
    TimeField business_end_time
    JSONField working_days
    CharField fiscal_name
    CharField fiscal_rtn
    TextField fiscal_address
    CharField fiscal_phone
    CharField fiscal_email
    TextField footer_invoice_text
    TextField terms_and_conditions
    TextField privacy_policy
    BooleanField active
  }
  subscriptions_subscriptionplan {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    CharField name
    SlugField code UK
    TextField description
    DecimalField price_monthly
    DecimalField price_yearly
    PositiveIntegerField max_users
    PositiveIntegerField max_doctors
    PositiveIntegerField max_patients
    PositiveIntegerField max_appointments_per_month
    PositiveIntegerField max_storage_mb
    BooleanField allow_billing
    BooleanField allow_inventory
    BooleanField allow_purchases
    BooleanField allow_reports
    BooleanField allow_audit
    BooleanField allow_notifications
    BooleanField allow_patient_portal
    BooleanField allow_mobile_api
    BooleanField allow_multi_branch
    CharField support_level
    BooleanField active
  }
  subscriptions_clinicsubscription {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic UK FK
    FK plan FK
    CharField status
    CharField billing_cycle
    DateField start_date
    DateField end_date
    DateField trial_end_date
    DateField next_payment_date
    DateTimeField cancelled_at
    TextField suspension_reason
    TextField notes
    BooleanField active
  }
  documents_documentcategory {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    CharField name
    TextField description
    CharField document_type
    BooleanField active
  }
  documents_clinicaldocument {
    BigAutoField id PK UK
    DateTimeField creado_en
    DateTimeField actualizado_en
    FK clinic FK
    FK patient FK
    FK medical_record FK
    FK consultation FK
    FK appointment FK
    FK prescription FK
    FK medical_order FK
    FK invoice FK
    FK category FK
    CharField title
    TextField description
    FileField file
    CharField original_filename
    CharField file_type
    CharField mime_type
    PositiveBigIntegerField file_size
    CharField file_extension
    CharField storage_backend
    FK uploaded_by FK
    BooleanField visible_to_patient
    BooleanField is_sensitive
    CharField status
    PositiveIntegerField version
    FK replaced_by FK
    CharField checksum
    JSONField tags
    TextField notes
    BooleanField active
  }
  security_passwordresettoken {
    BigAutoField id PK UK
    FK user FK
    CharField token_hash
    DateTimeField expires_at
    DateTimeField used_at
    GenericIPAddressField ip_address
    TextField user_agent
    DateTimeField created_at
  }
  security_emailverificationtoken {
    BigAutoField id PK UK
    FK user FK
    CharField token_hash
    DateTimeField expires_at
    DateTimeField used_at
    DateTimeField created_at
  }
  security_loginattempt {
    BigAutoField id PK UK
    CharField email
    FK user FK
    BooleanField success
    CharField failure_reason
    GenericIPAddressField ip_address
    TextField user_agent
    DateTimeField created_at
  }
  security_accountlock {
    BigAutoField id PK UK
    FK user FK
    DateTimeField locked_until
    CharField reason
    PositiveIntegerField failed_attempts
    BooleanField active
    DateTimeField created_at
    DateTimeField unlocked_at
    FK unlocked_by FK
  }
  security_usersession {
    BigAutoField id PK UK
    FK user FK
    CharField session_key UK
    CharField refresh_token_hash
    GenericIPAddressField ip_address
    TextField user_agent
    CharField device_name
    DateTimeField last_activity_at
    DateTimeField expires_at
    DateTimeField revoked_at
    FK revoked_by FK
    BooleanField active
    DateTimeField created_at
  }
  security_securitysetting {
    BigAutoField id PK UK
    FK clinic FK
    PositiveIntegerField password_min_length
    BooleanField password_require_uppercase
    BooleanField password_require_lowercase
    BooleanField password_require_number
    BooleanField password_require_symbol
    PositiveIntegerField max_failed_login_attempts
    PositiveIntegerField lockout_minutes
    PositiveIntegerField password_reset_token_minutes
    PositiveIntegerField email_verification_token_minutes
    PositiveIntegerField session_lifetime_minutes
    BooleanField require_email_verification
    BooleanField active
    DateTimeField created_at
    DateTimeField updated_at
  }
  clinics_clinic ||--o{ accounts_user : "clinica"
  accounts_role ||--o{ accounts_user : "role"
  clinics_clinic ||--o{ doctors_doctorprofile : "clinic"
  accounts_user ||--|| doctors_doctorprofile : "user"
  doctors_medicalspecialty ||--o{ doctors_doctorprofile : "specialty"
  doctors_doctorprofile ||--o{ doctors_doctorschedule : "doctor"
  clinics_clinic ||--o{ patients_patient : "clinic"
  accounts_user ||--|| patients_patient : "user"
  clinics_clinic ||--o{ appointments_appointment : "clinic"
  patients_patient ||--o{ appointments_appointment : "patient"
  doctors_doctorprofile ||--o{ appointments_appointment : "doctor"
  accounts_user ||--o{ appointments_appointment : "created_by"
  accounts_user ||--o{ appointments_appointment : "cancelled_by"
  clinics_clinic ||--o{ admissions_patientvisit : "clinic"
  patients_patient ||--o{ admissions_patientvisit : "patient"
  appointments_appointment ||--o{ admissions_patientvisit : "appointment"
  medical_records_medicalrecord ||--o{ admissions_patientvisit : "medical_record"
  medical_records_clinicalconsultation ||--o{ admissions_patientvisit : "consultation"
  billing_invoice ||--o{ admissions_patientvisit : "invoice"
  doctors_doctorprofile ||--o{ admissions_patientvisit : "assigned_doctor"
  accounts_user ||--o{ admissions_patientvisit : "assigned_nurse"
  accounts_user ||--o{ admissions_patientvisit : "created_by"
  accounts_user ||--o{ admissions_patientvisit : "checked_in_by"
  clinics_clinic ||--o{ medical_records_medicalrecord : "clinic"
  patients_patient ||--|| medical_records_medicalrecord : "patient"
  clinics_clinic ||--o{ medical_records_clinicalconsultation : "clinic"
  medical_records_medicalrecord ||--o{ medical_records_clinicalconsultation : "medical_record"
  patients_patient ||--o{ medical_records_clinicalconsultation : "patient"
  doctors_doctorprofile ||--o{ medical_records_clinicalconsultation : "doctor"
  appointments_appointment ||--|| medical_records_clinicalconsultation : "appointment"
  admissions_patientvisit ||--o{ medical_records_clinicalconsultation : "patient_visit"
  accounts_user ||--o{ medical_records_clinicalconsultation : "created_by"
  accounts_user ||--o{ medical_records_clinicalconsultation : "finalized_by"
  medical_records_clinicalconsultation ||--|| medical_records_vitalsigns : "consultation"
  admissions_patientvisit ||--o{ medical_records_vitalsigns : "patient_visit"
  accounts_user ||--o{ medical_records_vitalsigns : "registrado_por"
  clinics_clinic ||--o{ medical_records_clinicalsupplyusage : "clinic"
  patients_patient ||--o{ medical_records_clinicalsupplyusage : "patient"
  medical_records_clinicalconsultation ||--o{ medical_records_clinicalsupplyusage : "consultation"
  appointments_appointment ||--o{ medical_records_clinicalsupplyusage : "appointment"
  doctors_doctorprofile ||--o{ medical_records_clinicalsupplyusage : "doctor"
  accounts_user ||--o{ medical_records_clinicalsupplyusage : "nurse"
  inventory_inventoryitem ||--o{ medical_records_clinicalsupplyusage : "inventory_item"
  inventory_inventorylot ||--o{ medical_records_clinicalsupplyusage : "inventory_lot"
  billing_invoice ||--o{ medical_records_clinicalsupplyusage : "invoice"
  billing_invoiceitem ||--o{ medical_records_clinicalsupplyusage : "invoice_item"
  inventory_inventorymovement ||--o{ medical_records_clinicalsupplyusage : "inventory_movement"
  accounts_user ||--o{ medical_records_clinicalsupplyusage : "applied_by"
  clinics_clinic ||--o{ prescriptions_diagnosis : "clinic"
  patients_patient ||--o{ prescriptions_diagnosis : "patient"
  doctors_doctorprofile ||--o{ prescriptions_diagnosis : "doctor"
  medical_records_clinicalconsultation ||--o{ prescriptions_diagnosis : "consultation"
  clinics_clinic ||--o{ prescriptions_prescription : "clinic"
  patients_patient ||--o{ prescriptions_prescription : "patient"
  doctors_doctorprofile ||--o{ prescriptions_prescription : "doctor"
  medical_records_clinicalconsultation ||--o{ prescriptions_prescription : "consultation"
  prescriptions_prescription ||--o{ prescriptions_prescriptionitem : "prescription"
  clinics_clinic ||--o{ prescriptions_medicalorder : "clinic"
  patients_patient ||--o{ prescriptions_medicalorder : "patient"
  doctors_doctorprofile ||--o{ prescriptions_medicalorder : "doctor"
  medical_records_clinicalconsultation ||--o{ prescriptions_medicalorder : "consultation"
  clinics_clinic ||--o{ billing_billableservice : "clinic"
  clinics_clinic ||--o{ billing_invoice : "clinic"
  patients_patient ||--o{ billing_invoice : "patient"
  appointments_appointment ||--o{ billing_invoice : "appointment"
  medical_records_clinicalconsultation ||--o{ billing_invoice : "consultation"
  accounts_user ||--o{ billing_invoice : "created_by"
  accounts_user ||--o{ billing_invoice : "cancelled_by"
  billing_invoice ||--o{ billing_invoiceitem : "invoice"
  billing_billableservice ||--o{ billing_invoiceitem : "service"
  inventory_inventoryitem ||--o{ billing_invoiceitem : "inventory_item"
  inventory_inventorylot ||--o{ billing_invoiceitem : "inventory_lot"
  medical_records_clinicalconsultation ||--o{ billing_invoiceitem : "related_consultation"
  medical_records_clinicalsupplyusage ||--o{ billing_invoiceitem : "related_consumption"
  inventory_inventorymovement ||--o{ billing_invoiceitem : "inventory_movement"
  clinics_clinic ||--o{ billing_cashsession : "clinic"
  accounts_user ||--o{ billing_cashsession : "opened_by"
  accounts_user ||--o{ billing_cashsession : "closed_by"
  clinics_clinic ||--o{ billing_payment : "clinic"
  billing_invoice ||--o{ billing_payment : "invoice"
  patients_patient ||--o{ billing_payment : "patient"
  billing_cashsession ||--o{ billing_payment : "cash_session"
  accounts_user ||--o{ billing_payment : "received_by"
  accounts_user ||--o{ billing_payment : "cancelled_by"
  clinics_clinic ||--o{ billing_cashmovement : "clinic"
  billing_cashsession ||--o{ billing_cashmovement : "cash_session"
  accounts_user ||--o{ billing_cashmovement : "created_by"
  clinics_clinic ||--o{ inventory_inventorycategory : "clinic"
  clinics_clinic ||--o{ inventory_inventoryitem : "clinic"
  inventory_inventorycategory ||--o{ inventory_inventoryitem : "category"
  clinics_clinic ||--o{ inventory_inventorylot : "clinic"
  inventory_inventoryitem ||--o{ inventory_inventorylot : "item"
  clinics_clinic ||--o{ inventory_inventorymovement : "clinic"
  inventory_inventoryitem ||--o{ inventory_inventorymovement : "item"
  inventory_inventorylot ||--o{ inventory_inventorymovement : "lot"
  accounts_user ||--o{ inventory_inventorymovement : "performed_by"
  clinics_clinic ||--o{ purchases_supplier : "clinic"
  clinics_clinic ||--o{ purchases_purchaseorder : "clinic"
  purchases_supplier ||--o{ purchases_purchaseorder : "supplier"
  accounts_user ||--o{ purchases_purchaseorder : "created_by"
  accounts_user ||--o{ purchases_purchaseorder : "approved_by"
  accounts_user ||--o{ purchases_purchaseorder : "cancelled_by"
  purchases_purchaseorder ||--o{ purchases_purchaseorderitem : "purchase_order"
  inventory_inventoryitem ||--o{ purchases_purchaseorderitem : "item"
  clinics_clinic ||--o{ purchases_purchasereceipt : "clinic"
  purchases_purchaseorder ||--o{ purchases_purchasereceipt : "purchase_order"
  accounts_user ||--o{ purchases_purchasereceipt : "received_by"
  purchases_purchasereceipt ||--o{ purchases_purchasereceiptitem : "receipt"
  purchases_purchaseorderitem ||--o{ purchases_purchasereceiptitem : "purchase_order_item"
  inventory_inventoryitem ||--o{ purchases_purchasereceiptitem : "item"
  inventory_inventorylot ||--o{ purchases_purchasereceiptitem : "lot"
  inventory_inventorymovement ||--o{ purchases_purchasereceiptitem : "inventory_movement"
  clinics_clinic ||--o{ audit_auditlog : "clinic"
  accounts_user ||--o{ audit_auditlog : "user"
  clinics_clinic ||--o{ notifications_notification : "clinic"
  accounts_user ||--o{ notifications_notification : "recipient"
  accounts_user ||--|| notifications_notificationpreference : "user"
  clinics_clinic ||--|| clinic_settings_clinicsettings : "clinic"
  clinics_clinic ||--|| subscriptions_clinicsubscription : "clinic"
  subscriptions_subscriptionplan ||--o{ subscriptions_clinicsubscription : "plan"
  clinics_clinic ||--o{ documents_documentcategory : "clinic"
  clinics_clinic ||--o{ documents_clinicaldocument : "clinic"
  patients_patient ||--o{ documents_clinicaldocument : "patient"
  medical_records_medicalrecord ||--o{ documents_clinicaldocument : "medical_record"
  medical_records_clinicalconsultation ||--o{ documents_clinicaldocument : "consultation"
  appointments_appointment ||--o{ documents_clinicaldocument : "appointment"
  prescriptions_prescription ||--o{ documents_clinicaldocument : "prescription"
  prescriptions_medicalorder ||--o{ documents_clinicaldocument : "medical_order"
  billing_invoice ||--o{ documents_clinicaldocument : "invoice"
  documents_documentcategory ||--o{ documents_clinicaldocument : "category"
  accounts_user ||--o{ documents_clinicaldocument : "uploaded_by"
  documents_clinicaldocument ||--o{ documents_clinicaldocument : "replaced_by"
  accounts_user ||--o{ security_passwordresettoken : "user"
  accounts_user ||--o{ security_emailverificationtoken : "user"
  accounts_user ||--o{ security_loginattempt : "user"
  accounts_user ||--o{ security_accountlock : "user"
  accounts_user ||--o{ security_accountlock : "unlocked_by"
  accounts_user ||--o{ security_usersession : "user"
  accounts_user ||--o{ security_usersession : "revoked_by"
  clinics_clinic ||--o{ security_securitysetting : "clinic"
```

## Inventario de tablas MediCore

### accounts

#### `accounts_role` - `Role`

- Registros actuales: **6**
- Descripcion: Role(id, creado_en, actualizado_en, nombre, descripcion, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `nombre` | `CharField` | No | Si |  |
| `descripcion` | `TextField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

#### `accounts_user` - `User`

- Registros actuales: **10**
- Descripcion: User(id, password, last_login, is_superuser, creado_en, actualizado_en, clinica, role, nombre_completo, email, telefono, avatar_url, is_active, is_staff, ultimo_acceso, email_verified, last_login_ip, last_login_user_agent, password_changed_at, date_joined)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `password` | `CharField` | No | No |  |
| `last_login` | `DateTimeField` | Si | No |  |
| `is_superuser` | `BooleanField` | No | No |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinica` | `FK` | Si | No | clinics.Clinic |
| `role` | `FK` | No | No | accounts.Role |
| `nombre_completo` | `CharField` | No | No |  |
| `email` | `CharField` | No | Si |  |
| `telefono` | `CharField` | No | No |  |
| `avatar_url` | `CharField` | No | No |  |
| `is_active` | `BooleanField` | No | No |  |
| `is_staff` | `BooleanField` | No | No |  |
| `ultimo_acceso` | `DateTimeField` | Si | No |  |
| `email_verified` | `BooleanField` | No | No |  |
| `last_login_ip` | `GenericIPAddressField` | Si | No |  |
| `last_login_user_agent` | `TextField` | No | No |  |
| `password_changed_at` | `DateTimeField` | Si | No |  |
| `date_joined` | `DateTimeField` | No | No |  |
| `groups` | `M2M` | No | No | auth.Group |
| `user_permissions` | `M2M` | No | No | auth.Permission |

### admissions

#### `admissions_patientvisit` - `PatientVisit`

- Registros actuales: **1**
- Descripcion: PatientVisit(id, creado_en, actualizado_en, clinic, patient, appointment, medical_record, consultation, invoice, visit_number, visit_date, arrival_time, triage_started_at, triage_completed_at, consultation_started_at, consultation_completed_at, checkout_at, visit_type, priority, status, reason, symptoms, notes, assigned_doctor, assigned_nurse, created_by, checked_in_by, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `patient` | `FK` | No | No | patients.Patient |
| `appointment` | `FK` | Si | No | appointments.Appointment |
| `medical_record` | `FK` | No | No | medical_records.MedicalRecord |
| `consultation` | `FK` | Si | No | medical_records.ClinicalConsultation |
| `invoice` | `FK` | Si | No | billing.Invoice |
| `visit_number` | `CharField` | No | No |  |
| `visit_date` | `DateField` | No | No |  |
| `arrival_time` | `DateTimeField` | No | No |  |
| `triage_started_at` | `DateTimeField` | Si | No |  |
| `triage_completed_at` | `DateTimeField` | Si | No |  |
| `consultation_started_at` | `DateTimeField` | Si | No |  |
| `consultation_completed_at` | `DateTimeField` | Si | No |  |
| `checkout_at` | `DateTimeField` | Si | No |  |
| `visit_type` | `CharField` | No | No |  |
| `priority` | `CharField` | No | No |  |
| `status` | `CharField` | No | No |  |
| `reason` | `CharField` | No | No |  |
| `symptoms` | `TextField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `assigned_doctor` | `FK` | Si | No | doctors.DoctorProfile |
| `assigned_nurse` | `FK` | Si | No | accounts.User |
| `created_by` | `FK` | Si | No | accounts.User |
| `checked_in_by` | `FK` | Si | No | accounts.User |
| `active` | `BooleanField` | No | No |  |

### appointments

#### `appointments_appointment` - `Appointment`

- Registros actuales: **4**
- Descripcion: Appointment(id, creado_en, actualizado_en, clinic, patient, doctor, created_by, scheduled_date, start_time, end_time, reason, notes, status, cancellation_reason, cancelled_by, cancelled_at, confirmed_at, attended_at, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `patient` | `FK` | No | No | patients.Patient |
| `doctor` | `FK` | No | No | doctors.DoctorProfile |
| `created_by` | `FK` | Si | No | accounts.User |
| `scheduled_date` | `DateField` | No | No |  |
| `start_time` | `TimeField` | No | No |  |
| `end_time` | `TimeField` | No | No |  |
| `reason` | `CharField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `status` | `CharField` | No | No |  |
| `cancellation_reason` | `TextField` | No | No |  |
| `cancelled_by` | `FK` | Si | No | accounts.User |
| `cancelled_at` | `DateTimeField` | Si | No |  |
| `confirmed_at` | `DateTimeField` | Si | No |  |
| `attended_at` | `DateTimeField` | Si | No |  |
| `activo` | `BooleanField` | No | No |  |

### audit

#### `audit_auditlog` - `AuditLog`

- Registros actuales: **116**
- Descripcion: AuditLog(id, clinic, user, action, module, model_name, object_id, object_repr, description, severity, ip_address, user_agent, request_method, request_path, old_values, new_values, metadata, created_at)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `clinic` | `FK` | Si | No | clinics.Clinic |
| `user` | `FK` | Si | No | accounts.User |
| `action` | `CharField` | No | No |  |
| `module` | `CharField` | No | No |  |
| `model_name` | `CharField` | No | No |  |
| `object_id` | `CharField` | No | No |  |
| `object_repr` | `CharField` | No | No |  |
| `description` | `TextField` | No | No |  |
| `severity` | `CharField` | No | No |  |
| `ip_address` | `GenericIPAddressField` | Si | No |  |
| `user_agent` | `TextField` | No | No |  |
| `request_method` | `CharField` | No | No |  |
| `request_path` | `CharField` | No | No |  |
| `old_values` | `JSONField` | No | No |  |
| `new_values` | `JSONField` | No | No |  |
| `metadata` | `JSONField` | No | No |  |
| `created_at` | `DateTimeField` | No | No |  |

### billing

#### `billing_billableservice` - `BillableService`

- Registros actuales: **6**
- Descripcion: BillableService(id, creado_en, actualizado_en, clinic, name, description, code, price, taxable, tax_rate, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `name` | `CharField` | No | No |  |
| `description` | `TextField` | No | No |  |
| `code` | `CharField` | No | No |  |
| `price` | `DecimalField` | No | No |  |
| `taxable` | `BooleanField` | No | No |  |
| `tax_rate` | `DecimalField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `billing_invoice` - `Invoice`

- Registros actuales: **4**
- Descripcion: Invoice(id, creado_en, actualizado_en, clinic, patient, appointment, consultation, invoice_number, issue_date, due_date, status, subtotal, discount_amount, tax_amount, total_amount, paid_amount, balance_due, notes, created_by, cancelled_by, cancelled_at, cancellation_reason, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `patient` | `FK` | No | No | patients.Patient |
| `appointment` | `FK` | Si | No | appointments.Appointment |
| `consultation` | `FK` | Si | No | medical_records.ClinicalConsultation |
| `invoice_number` | `CharField` | No | No |  |
| `issue_date` | `DateField` | No | No |  |
| `due_date` | `DateField` | Si | No |  |
| `status` | `CharField` | No | No |  |
| `subtotal` | `DecimalField` | No | No |  |
| `discount_amount` | `DecimalField` | No | No |  |
| `tax_amount` | `DecimalField` | No | No |  |
| `total_amount` | `DecimalField` | No | No |  |
| `paid_amount` | `DecimalField` | No | No |  |
| `balance_due` | `DecimalField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `created_by` | `FK` | Si | No | accounts.User |
| `cancelled_by` | `FK` | Si | No | accounts.User |
| `cancelled_at` | `DateTimeField` | Si | No |  |
| `cancellation_reason` | `TextField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `billing_invoiceitem` - `InvoiceItem`

- Registros actuales: **6**
- Descripcion: InvoiceItem(id, creado_en, actualizado_en, invoice, item_type, service, inventory_item, inventory_lot, related_consultation, related_consumption, inventory_movement, description, quantity, unit_price, discount_amount, tax_rate, tax_amount, line_total, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `invoice` | `FK` | No | No | billing.Invoice |
| `item_type` | `CharField` | No | No |  |
| `service` | `FK` | Si | No | billing.BillableService |
| `inventory_item` | `FK` | Si | No | inventory.InventoryItem |
| `inventory_lot` | `FK` | Si | No | inventory.InventoryLot |
| `related_consultation` | `FK` | Si | No | medical_records.ClinicalConsultation |
| `related_consumption` | `FK` | Si | No | medical_records.ClinicalSupplyUsage |
| `inventory_movement` | `FK` | Si | No | inventory.InventoryMovement |
| `description` | `CharField` | No | No |  |
| `quantity` | `DecimalField` | No | No |  |
| `unit_price` | `DecimalField` | No | No |  |
| `discount_amount` | `DecimalField` | No | No |  |
| `tax_rate` | `DecimalField` | No | No |  |
| `tax_amount` | `DecimalField` | No | No |  |
| `line_total` | `DecimalField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `billing_cashsession` - `CashSession`

- Registros actuales: **1**
- Descripcion: CashSession(id, creado_en, actualizado_en, clinic, opened_by, closed_by, opening_datetime, closing_datetime, opening_amount, closing_amount, expected_amount, difference_amount, status, notes, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `opened_by` | `FK` | No | No | accounts.User |
| `closed_by` | `FK` | Si | No | accounts.User |
| `opening_datetime` | `DateTimeField` | No | No |  |
| `closing_datetime` | `DateTimeField` | Si | No |  |
| `opening_amount` | `DecimalField` | No | No |  |
| `closing_amount` | `DecimalField` | Si | No |  |
| `expected_amount` | `DecimalField` | No | No |  |
| `difference_amount` | `DecimalField` | No | No |  |
| `status` | `CharField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `billing_payment` - `Payment`

- Registros actuales: **4**
- Descripcion: Payment(id, creado_en, actualizado_en, clinic, invoice, patient, cash_session, payment_number, payment_date, amount, method, reference, notes, status, received_by, cancelled_by, cancelled_at, cancellation_reason, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `invoice` | `FK` | No | No | billing.Invoice |
| `patient` | `FK` | No | No | patients.Patient |
| `cash_session` | `FK` | Si | No | billing.CashSession |
| `payment_number` | `CharField` | No | No |  |
| `payment_date` | `DateField` | No | No |  |
| `amount` | `DecimalField` | No | No |  |
| `method` | `CharField` | No | No |  |
| `reference` | `CharField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `status` | `CharField` | No | No |  |
| `received_by` | `FK` | Si | No | accounts.User |
| `cancelled_by` | `FK` | Si | No | accounts.User |
| `cancelled_at` | `DateTimeField` | Si | No |  |
| `cancellation_reason` | `TextField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `billing_cashmovement` - `CashMovement`

- Registros actuales: **0**
- Descripcion: CashMovement(id, creado_en, actualizado_en, clinic, cash_session, movement_type, amount, reason, notes, created_by, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `cash_session` | `FK` | No | No | billing.CashSession |
| `movement_type` | `CharField` | No | No |  |
| `amount` | `DecimalField` | No | No |  |
| `reason` | `CharField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `created_by` | `FK` | Si | No | accounts.User |
| `active` | `BooleanField` | No | No |  |

### clinic_settings

#### `clinic_settings_clinicsettings` - `ClinicSettings`

- Registros actuales: **5**
- Descripcion: ClinicSettings(id, creado_en, actualizado_en, clinic, logo_url, primary_color, secondary_color, accent_color, currency, country, timezone, language, tax_enabled, default_tax_rate, invoice_prefix, patient_prefix, medical_record_prefix, prescription_prefix, medical_order_prefix, purchase_order_prefix, appointment_duration_minutes, allow_online_appointments, allow_patient_cancellations, cancellation_hours_limit, require_appointment_confirmation, allow_patient_portal, allow_patient_medical_record_view, allow_patient_prescription_view, allow_patient_invoice_view, business_start_time, business_end_time, working_days, fiscal_name, fiscal_rtn, fiscal_address, fiscal_phone, fiscal_email, footer_invoice_text, terms_and_conditions, privacy_policy, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | Si | clinics.Clinic |
| `logo_url` | `CharField` | No | No |  |
| `primary_color` | `CharField` | No | No |  |
| `secondary_color` | `CharField` | No | No |  |
| `accent_color` | `CharField` | No | No |  |
| `currency` | `CharField` | No | No |  |
| `country` | `CharField` | No | No |  |
| `timezone` | `CharField` | No | No |  |
| `language` | `CharField` | No | No |  |
| `tax_enabled` | `BooleanField` | No | No |  |
| `default_tax_rate` | `DecimalField` | No | No |  |
| `invoice_prefix` | `CharField` | No | No |  |
| `patient_prefix` | `CharField` | No | No |  |
| `medical_record_prefix` | `CharField` | No | No |  |
| `prescription_prefix` | `CharField` | No | No |  |
| `medical_order_prefix` | `CharField` | No | No |  |
| `purchase_order_prefix` | `CharField` | No | No |  |
| `appointment_duration_minutes` | `PositiveIntegerField` | No | No |  |
| `allow_online_appointments` | `BooleanField` | No | No |  |
| `allow_patient_cancellations` | `BooleanField` | No | No |  |
| `cancellation_hours_limit` | `PositiveIntegerField` | No | No |  |
| `require_appointment_confirmation` | `BooleanField` | No | No |  |
| `allow_patient_portal` | `BooleanField` | No | No |  |
| `allow_patient_medical_record_view` | `BooleanField` | No | No |  |
| `allow_patient_prescription_view` | `BooleanField` | No | No |  |
| `allow_patient_invoice_view` | `BooleanField` | No | No |  |
| `business_start_time` | `TimeField` | No | No |  |
| `business_end_time` | `TimeField` | No | No |  |
| `working_days` | `JSONField` | No | No |  |
| `fiscal_name` | `CharField` | No | No |  |
| `fiscal_rtn` | `CharField` | No | No |  |
| `fiscal_address` | `TextField` | No | No |  |
| `fiscal_phone` | `CharField` | No | No |  |
| `fiscal_email` | `CharField` | No | No |  |
| `footer_invoice_text` | `TextField` | No | No |  |
| `terms_and_conditions` | `TextField` | No | No |  |
| `privacy_policy` | `TextField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

### clinics

#### `clinics_clinic` - `Clinic`

- Registros actuales: **6**
- Descripcion: Clinic(id, creado_en, actualizado_en, nombre, rtn, telefono, correo, direccion, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `nombre` | `CharField` | No | No |  |
| `rtn` | `CharField` | No | No |  |
| `telefono` | `CharField` | No | No |  |
| `correo` | `CharField` | No | No |  |
| `direccion` | `TextField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

### doctors

#### `doctors_medicalspecialty` - `MedicalSpecialty`

- Registros actuales: **10**
- Descripcion: MedicalSpecialty(id, creado_en, actualizado_en, nombre, descripcion, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `nombre` | `CharField` | No | Si |  |
| `descripcion` | `TextField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

#### `doctors_doctorprofile` - `DoctorProfile`

- Registros actuales: **2**
- Descripcion: DoctorProfile(id, creado_en, actualizado_en, clinic, user, specialty, numero_colegiacion, titulo_profesional, biografia, tarifa_consulta, duracion_consulta_minutos, atiende_virtual, atiende_presencial, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `user` | `FK` | No | Si | accounts.User |
| `specialty` | `FK` | No | No | doctors.MedicalSpecialty |
| `numero_colegiacion` | `CharField` | No | No |  |
| `titulo_profesional` | `CharField` | No | No |  |
| `biografia` | `TextField` | No | No |  |
| `tarifa_consulta` | `DecimalField` | No | No |  |
| `duracion_consulta_minutos` | `PositiveIntegerField` | No | No |  |
| `atiende_virtual` | `BooleanField` | No | No |  |
| `atiende_presencial` | `BooleanField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

#### `doctors_doctorschedule` - `DoctorSchedule`

- Registros actuales: **5**
- Descripcion: DoctorSchedule(id, creado_en, actualizado_en, doctor, dia_semana, hora_inicio, hora_fin, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `doctor` | `FK` | No | No | doctors.DoctorProfile |
| `dia_semana` | `CharField` | No | No |  |
| `hora_inicio` | `TimeField` | No | No |  |
| `hora_fin` | `TimeField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

### documents

#### `documents_documentcategory` - `DocumentCategory`

- Registros actuales: **10**
- Descripcion: DocumentCategory(id, creado_en, actualizado_en, clinic, name, description, document_type, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | Si | No | clinics.Clinic |
| `name` | `CharField` | No | No |  |
| `description` | `TextField` | No | No |  |
| `document_type` | `CharField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `documents_clinicaldocument` - `ClinicalDocument`

- Registros actuales: **2**
- Descripcion: ClinicalDocument(id, creado_en, actualizado_en, clinic, patient, medical_record, consultation, appointment, prescription, medical_order, invoice, category, title, description, file, original_filename, file_type, mime_type, file_size, file_extension, storage_backend, uploaded_by, visible_to_patient, is_sensitive, status, version, replaced_by, checksum, tags, notes, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `patient` | `FK` | No | No | patients.Patient |
| `medical_record` | `FK` | Si | No | medical_records.MedicalRecord |
| `consultation` | `FK` | Si | No | medical_records.ClinicalConsultation |
| `appointment` | `FK` | Si | No | appointments.Appointment |
| `prescription` | `FK` | Si | No | prescriptions.Prescription |
| `medical_order` | `FK` | Si | No | prescriptions.MedicalOrder |
| `invoice` | `FK` | Si | No | billing.Invoice |
| `category` | `FK` | Si | No | documents.DocumentCategory |
| `title` | `CharField` | No | No |  |
| `description` | `TextField` | No | No |  |
| `file` | `FileField` | No | No |  |
| `original_filename` | `CharField` | No | No |  |
| `file_type` | `CharField` | No | No |  |
| `mime_type` | `CharField` | No | No |  |
| `file_size` | `PositiveBigIntegerField` | No | No |  |
| `file_extension` | `CharField` | No | No |  |
| `storage_backend` | `CharField` | No | No |  |
| `uploaded_by` | `FK` | Si | No | accounts.User |
| `visible_to_patient` | `BooleanField` | No | No |  |
| `is_sensitive` | `BooleanField` | No | No |  |
| `status` | `CharField` | No | No |  |
| `version` | `PositiveIntegerField` | No | No |  |
| `replaced_by` | `FK` | Si | No | documents.ClinicalDocument |
| `checksum` | `CharField` | No | No |  |
| `tags` | `JSONField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

### inventory

#### `inventory_inventorycategory` - `InventoryCategory`

- Registros actuales: **7**
- Descripcion: InventoryCategory(id, creado_en, actualizado_en, clinic, name, description, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | Si | No | clinics.Clinic |
| `name` | `CharField` | No | No |  |
| `description` | `TextField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `inventory_inventoryitem` - `InventoryItem`

- Registros actuales: **7**
- Descripcion: InventoryItem(id, creado_en, actualizado_en, clinic, category, name, description, sku, barcode, item_type, unit, presentation, cost_price, sale_price, stock_current, stock_minimum, stock_maximum, requires_lot, requires_expiration, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `category` | `FK` | No | No | inventory.InventoryCategory |
| `name` | `CharField` | No | No |  |
| `description` | `TextField` | No | No |  |
| `sku` | `CharField` | No | No |  |
| `barcode` | `CharField` | No | No |  |
| `item_type` | `CharField` | No | No |  |
| `unit` | `CharField` | No | No |  |
| `presentation` | `CharField` | No | No |  |
| `cost_price` | `DecimalField` | No | No |  |
| `sale_price` | `DecimalField` | No | No |  |
| `stock_current` | `DecimalField` | No | No |  |
| `stock_minimum` | `DecimalField` | No | No |  |
| `stock_maximum` | `DecimalField` | No | No |  |
| `requires_lot` | `BooleanField` | No | No |  |
| `requires_expiration` | `BooleanField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `inventory_inventorylot` - `InventoryLot`

- Registros actuales: **4**
- Descripcion: InventoryLot(id, creado_en, actualizado_en, clinic, item, lot_number, expiration_date, quantity_current, cost_price, received_date, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `item` | `FK` | No | No | inventory.InventoryItem |
| `lot_number` | `CharField` | No | No |  |
| `expiration_date` | `DateField` | Si | No |  |
| `quantity_current` | `DecimalField` | No | No |  |
| `cost_price` | `DecimalField` | No | No |  |
| `received_date` | `DateField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `inventory_inventorymovement` - `InventoryMovement`

- Registros actuales: **7**
- Descripcion: InventoryMovement(id, creado_en, actualizado_en, clinic, item, lot, movement_type, quantity, unit_cost, reason, reference_type, reference_id, notes, performed_by, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `item` | `FK` | No | No | inventory.InventoryItem |
| `lot` | `FK` | Si | No | inventory.InventoryLot |
| `movement_type` | `CharField` | No | No |  |
| `quantity` | `DecimalField` | No | No |  |
| `unit_cost` | `DecimalField` | No | No |  |
| `reason` | `CharField` | No | No |  |
| `reference_type` | `CharField` | No | No |  |
| `reference_id` | `CharField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `performed_by` | `FK` | Si | No | accounts.User |
| `active` | `BooleanField` | No | No |  |

### medical_records

#### `medical_records_medicalrecord` - `MedicalRecord`

- Registros actuales: **3**
- Descripcion: MedicalRecord(id, creado_en, actualizado_en, clinic, patient, record_number, blood_type, allergies, chronic_diseases, surgical_history, family_history, current_medications, general_notes, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `patient` | `FK` | No | Si | patients.Patient |
| `record_number` | `CharField` | No | No |  |
| `blood_type` | `CharField` | No | No |  |
| `allergies` | `TextField` | No | No |  |
| `chronic_diseases` | `TextField` | No | No |  |
| `surgical_history` | `TextField` | No | No |  |
| `family_history` | `TextField` | No | No |  |
| `current_medications` | `TextField` | No | No |  |
| `general_notes` | `TextField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

#### `medical_records_clinicalconsultation` - `ClinicalConsultation`

- Registros actuales: **1**
- Descripcion: ClinicalConsultation(id, creado_en, actualizado_en, clinic, medical_record, patient, doctor, appointment, patient_visit, consultation_date, start_time, end_time, chief_complaint, symptoms, physical_exam, clinical_assessment, preliminary_diagnosis, treatment_plan, recommendations, private_notes, status, void_reason, created_by, finalized_by, finalized_at, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `medical_record` | `FK` | No | No | medical_records.MedicalRecord |
| `patient` | `FK` | No | No | patients.Patient |
| `doctor` | `FK` | No | No | doctors.DoctorProfile |
| `appointment` | `FK` | Si | Si | appointments.Appointment |
| `patient_visit` | `FK` | Si | No | admissions.PatientVisit |
| `consultation_date` | `DateField` | No | No |  |
| `start_time` | `TimeField` | Si | No |  |
| `end_time` | `TimeField` | Si | No |  |
| `chief_complaint` | `TextField` | No | No |  |
| `symptoms` | `TextField` | No | No |  |
| `physical_exam` | `TextField` | No | No |  |
| `clinical_assessment` | `TextField` | No | No |  |
| `preliminary_diagnosis` | `TextField` | No | No |  |
| `treatment_plan` | `TextField` | No | No |  |
| `recommendations` | `TextField` | No | No |  |
| `private_notes` | `TextField` | No | No |  |
| `status` | `CharField` | No | No |  |
| `void_reason` | `TextField` | No | No |  |
| `created_by` | `FK` | Si | No | accounts.User |
| `finalized_by` | `FK` | Si | No | accounts.User |
| `finalized_at` | `DateTimeField` | Si | No |  |
| `activo` | `BooleanField` | No | No |  |

#### `medical_records_vitalsigns` - `VitalSigns`

- Registros actuales: **1**
- Descripcion: VitalSigns(id, creado_en, actualizado_en, consultation, patient_visit, temperature, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate, oxygen_saturation, weight, height, bmi, glucose, pain_scale, notes, registrado_por, recorded_at)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `consultation` | `FK` | Si | Si | medical_records.ClinicalConsultation |
| `patient_visit` | `FK` | Si | No | admissions.PatientVisit |
| `temperature` | `DecimalField` | Si | No |  |
| `blood_pressure_systolic` | `PositiveSmallIntegerField` | Si | No |  |
| `blood_pressure_diastolic` | `PositiveSmallIntegerField` | Si | No |  |
| `heart_rate` | `PositiveSmallIntegerField` | Si | No |  |
| `respiratory_rate` | `PositiveSmallIntegerField` | Si | No |  |
| `oxygen_saturation` | `PositiveSmallIntegerField` | Si | No |  |
| `weight` | `DecimalField` | Si | No |  |
| `height` | `DecimalField` | Si | No |  |
| `bmi` | `DecimalField` | Si | No |  |
| `glucose` | `PositiveSmallIntegerField` | Si | No |  |
| `pain_scale` | `PositiveSmallIntegerField` | Si | No |  |
| `notes` | `TextField` | No | No |  |
| `registrado_por` | `FK` | Si | No | accounts.User |
| `recorded_at` | `DateTimeField` | No | No |  |

#### `medical_records_clinicalsupplyusage` - `ClinicalSupplyUsage`

- Registros actuales: **0**
- Descripcion: ClinicalSupplyUsage(id, creado_en, actualizado_en, clinic, patient, consultation, appointment, doctor, nurse, inventory_item, inventory_lot, quantity, unit_cost, unit_price, total_price, usage_type, description, notes, billable, invoiced, invoice, invoice_item, inventory_movement, applied_by, applied_at, status, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `patient` | `FK` | No | No | patients.Patient |
| `consultation` | `FK` | Si | No | medical_records.ClinicalConsultation |
| `appointment` | `FK` | Si | No | appointments.Appointment |
| `doctor` | `FK` | Si | No | doctors.DoctorProfile |
| `nurse` | `FK` | Si | No | accounts.User |
| `inventory_item` | `FK` | No | No | inventory.InventoryItem |
| `inventory_lot` | `FK` | Si | No | inventory.InventoryLot |
| `quantity` | `DecimalField` | No | No |  |
| `unit_cost` | `DecimalField` | No | No |  |
| `unit_price` | `DecimalField` | No | No |  |
| `total_price` | `DecimalField` | No | No |  |
| `usage_type` | `CharField` | No | No |  |
| `description` | `CharField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `billable` | `BooleanField` | No | No |  |
| `invoiced` | `BooleanField` | No | No |  |
| `invoice` | `FK` | Si | No | billing.Invoice |
| `invoice_item` | `FK` | Si | No | billing.InvoiceItem |
| `inventory_movement` | `FK` | Si | No | inventory.InventoryMovement |
| `applied_by` | `FK` | Si | No | accounts.User |
| `applied_at` | `DateTimeField` | No | No |  |
| `status` | `CharField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

### notifications

#### `notifications_notification` - `Notification`

- Registros actuales: **63**
- Descripcion: Notification(id, creado_en, actualizado_en, clinic, recipient, title, message, notification_type, module, priority, status, related_model, related_object_id, action_url, read_at, sent_at, expires_at, metadata)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | Si | No | clinics.Clinic |
| `recipient` | `FK` | No | No | accounts.User |
| `title` | `CharField` | No | No |  |
| `message` | `TextField` | No | No |  |
| `notification_type` | `CharField` | No | No |  |
| `module` | `CharField` | No | No |  |
| `priority` | `CharField` | No | No |  |
| `status` | `CharField` | No | No |  |
| `related_model` | `CharField` | No | No |  |
| `related_object_id` | `CharField` | No | No |  |
| `action_url` | `CharField` | No | No |  |
| `read_at` | `DateTimeField` | Si | No |  |
| `sent_at` | `DateTimeField` | Si | No |  |
| `expires_at` | `DateTimeField` | Si | No |  |
| `metadata` | `JSONField` | No | No |  |

#### `notifications_notificationpreference` - `NotificationPreference`

- Registros actuales: **8**
- Descripcion: NotificationPreference(id, creado_en, actualizado_en, user, receive_appointment_reminders, receive_billing_alerts, receive_inventory_alerts, receive_purchase_alerts, receive_audit_alerts, receive_system_notifications, email_enabled, sms_enabled, whatsapp_enabled, push_enabled)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `user` | `FK` | No | Si | accounts.User |
| `receive_appointment_reminders` | `BooleanField` | No | No |  |
| `receive_billing_alerts` | `BooleanField` | No | No |  |
| `receive_inventory_alerts` | `BooleanField` | No | No |  |
| `receive_purchase_alerts` | `BooleanField` | No | No |  |
| `receive_audit_alerts` | `BooleanField` | No | No |  |
| `receive_system_notifications` | `BooleanField` | No | No |  |
| `email_enabled` | `BooleanField` | No | No |  |
| `sms_enabled` | `BooleanField` | No | No |  |
| `whatsapp_enabled` | `BooleanField` | No | No |  |
| `push_enabled` | `BooleanField` | No | No |  |

### patients

#### `patients_patient` - `Patient`

- Registros actuales: **3**
- Descripcion: Patient(id, creado_en, actualizado_en, clinic, user, codigo_paciente, nombres, apellidos, nombre_completo, identidad, fecha_nacimiento, genero, tipo_sangre, telefono, correo, direccion, ciudad, departamento, pais, contacto_emergencia_nombre, contacto_emergencia_telefono, contacto_emergencia_parentesco, alergias, enfermedades_cronicas, observaciones, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `user` | `FK` | Si | Si | accounts.User |
| `codigo_paciente` | `CharField` | No | No |  |
| `nombres` | `CharField` | No | No |  |
| `apellidos` | `CharField` | No | No |  |
| `nombre_completo` | `CharField` | No | No |  |
| `identidad` | `CharField` | No | No |  |
| `fecha_nacimiento` | `DateField` | Si | No |  |
| `genero` | `CharField` | No | No |  |
| `tipo_sangre` | `CharField` | No | No |  |
| `telefono` | `CharField` | No | No |  |
| `correo` | `CharField` | No | No |  |
| `direccion` | `TextField` | No | No |  |
| `ciudad` | `CharField` | No | No |  |
| `departamento` | `CharField` | No | No |  |
| `pais` | `CharField` | No | No |  |
| `contacto_emergencia_nombre` | `CharField` | No | No |  |
| `contacto_emergencia_telefono` | `CharField` | No | No |  |
| `contacto_emergencia_parentesco` | `CharField` | No | No |  |
| `alergias` | `TextField` | No | No |  |
| `enfermedades_cronicas` | `TextField` | No | No |  |
| `observaciones` | `TextField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

### prescriptions

#### `prescriptions_diagnosis` - `Diagnosis`

- Registros actuales: **3**
- Descripcion: Diagnosis(id, creado_en, actualizado_en, clinic, patient, doctor, consultation, code, name, description, diagnosis_type, is_primary, notes, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `patient` | `FK` | No | No | patients.Patient |
| `doctor` | `FK` | No | No | doctors.DoctorProfile |
| `consultation` | `FK` | No | No | medical_records.ClinicalConsultation |
| `code` | `CharField` | No | No |  |
| `name` | `CharField` | No | No |  |
| `description` | `TextField` | No | No |  |
| `diagnosis_type` | `CharField` | No | No |  |
| `is_primary` | `BooleanField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

#### `prescriptions_prescription` - `Prescription`

- Registros actuales: **1**
- Descripcion: Prescription(id, creado_en, actualizado_en, clinic, patient, doctor, consultation, prescription_number, issue_date, general_instructions, status, void_reason, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `patient` | `FK` | No | No | patients.Patient |
| `doctor` | `FK` | No | No | doctors.DoctorProfile |
| `consultation` | `FK` | No | No | medical_records.ClinicalConsultation |
| `prescription_number` | `CharField` | No | No |  |
| `issue_date` | `DateField` | No | No |  |
| `general_instructions` | `TextField` | No | No |  |
| `status` | `CharField` | No | No |  |
| `void_reason` | `TextField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

#### `prescriptions_prescriptionitem` - `PrescriptionItem`

- Registros actuales: **2**
- Descripcion: PrescriptionItem(id, creado_en, actualizado_en, prescription, medication_name, presentation, dosage, frequency, duration, quantity, route, instructions, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `prescription` | `FK` | No | No | prescriptions.Prescription |
| `medication_name` | `CharField` | No | No |  |
| `presentation` | `CharField` | No | No |  |
| `dosage` | `CharField` | No | No |  |
| `frequency` | `CharField` | No | No |  |
| `duration` | `CharField` | No | No |  |
| `quantity` | `CharField` | No | No |  |
| `route` | `CharField` | No | No |  |
| `instructions` | `TextField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

#### `prescriptions_medicalorder` - `MedicalOrder`

- Registros actuales: **3**
- Descripcion: MedicalOrder(id, creado_en, actualizado_en, clinic, patient, doctor, consultation, order_number, order_type, title, description, instructions, priority, status, activo)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `patient` | `FK` | No | No | patients.Patient |
| `doctor` | `FK` | No | No | doctors.DoctorProfile |
| `consultation` | `FK` | No | No | medical_records.ClinicalConsultation |
| `order_number` | `CharField` | No | No |  |
| `order_type` | `CharField` | No | No |  |
| `title` | `CharField` | No | No |  |
| `description` | `TextField` | No | No |  |
| `instructions` | `TextField` | No | No |  |
| `priority` | `CharField` | No | No |  |
| `status` | `CharField` | No | No |  |
| `activo` | `BooleanField` | No | No |  |

### purchases

#### `purchases_supplier` - `Supplier`

- Registros actuales: **6**
- Descripcion: Supplier(id, creado_en, actualizado_en, clinic, name, rtn, contact_name, phone, email, address, city, country, notes, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `name` | `CharField` | No | No |  |
| `rtn` | `CharField` | No | No |  |
| `contact_name` | `CharField` | No | No |  |
| `phone` | `CharField` | No | No |  |
| `email` | `CharField` | No | No |  |
| `address` | `TextField` | No | No |  |
| `city` | `CharField` | No | No |  |
| `country` | `CharField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `purchases_purchaseorder` - `PurchaseOrder`

- Registros actuales: **1**
- Descripcion: PurchaseOrder(id, creado_en, actualizado_en, clinic, supplier, order_number, order_date, expected_date, status, subtotal, discount_amount, tax_amount, total_amount, notes, created_by, approved_by, approved_at, cancelled_by, cancelled_at, cancellation_reason, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `supplier` | `FK` | No | No | purchases.Supplier |
| `order_number` | `CharField` | No | No |  |
| `order_date` | `DateField` | No | No |  |
| `expected_date` | `DateField` | Si | No |  |
| `status` | `CharField` | No | No |  |
| `subtotal` | `DecimalField` | No | No |  |
| `discount_amount` | `DecimalField` | No | No |  |
| `tax_amount` | `DecimalField` | No | No |  |
| `total_amount` | `DecimalField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `created_by` | `FK` | Si | No | accounts.User |
| `approved_by` | `FK` | Si | No | accounts.User |
| `approved_at` | `DateTimeField` | Si | No |  |
| `cancelled_by` | `FK` | Si | No | accounts.User |
| `cancelled_at` | `DateTimeField` | Si | No |  |
| `cancellation_reason` | `TextField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `purchases_purchaseorderitem` - `PurchaseOrderItem`

- Registros actuales: **3**
- Descripcion: PurchaseOrderItem(id, creado_en, actualizado_en, purchase_order, item, description, quantity_ordered, quantity_received, unit_cost, discount_amount, tax_rate, tax_amount, line_total, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `purchase_order` | `FK` | No | No | purchases.PurchaseOrder |
| `item` | `FK` | No | No | inventory.InventoryItem |
| `description` | `CharField` | No | No |  |
| `quantity_ordered` | `DecimalField` | No | No |  |
| `quantity_received` | `DecimalField` | No | No |  |
| `unit_cost` | `DecimalField` | No | No |  |
| `discount_amount` | `DecimalField` | No | No |  |
| `tax_rate` | `DecimalField` | No | No |  |
| `tax_amount` | `DecimalField` | No | No |  |
| `line_total` | `DecimalField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `purchases_purchasereceipt` - `PurchaseReceipt`

- Registros actuales: **1**
- Descripcion: PurchaseReceipt(id, creado_en, actualizado_en, clinic, purchase_order, receipt_number, receipt_date, received_by, notes, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | No | clinics.Clinic |
| `purchase_order` | `FK` | No | No | purchases.PurchaseOrder |
| `receipt_number` | `CharField` | No | No |  |
| `receipt_date` | `DateField` | No | No |  |
| `received_by` | `FK` | Si | No | accounts.User |
| `notes` | `TextField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `purchases_purchasereceiptitem` - `PurchaseReceiptItem`

- Registros actuales: **1**
- Descripcion: PurchaseReceiptItem(id, creado_en, actualizado_en, receipt, purchase_order_item, item, lot, quantity_received, unit_cost, lot_number, expiration_date, notes, inventory_movement, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `receipt` | `FK` | No | No | purchases.PurchaseReceipt |
| `purchase_order_item` | `FK` | No | No | purchases.PurchaseOrderItem |
| `item` | `FK` | No | No | inventory.InventoryItem |
| `lot` | `FK` | Si | No | inventory.InventoryLot |
| `quantity_received` | `DecimalField` | No | No |  |
| `unit_cost` | `DecimalField` | No | No |  |
| `lot_number` | `CharField` | No | No |  |
| `expiration_date` | `DateField` | Si | No |  |
| `notes` | `TextField` | No | No |  |
| `inventory_movement` | `FK` | Si | No | inventory.InventoryMovement |
| `active` | `BooleanField` | No | No |  |

### security

#### `security_passwordresettoken` - `PasswordResetToken`

- Registros actuales: **0**
- Descripcion: PasswordResetToken(id, user, token_hash, expires_at, used_at, ip_address, user_agent, created_at)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `user` | `FK` | No | No | accounts.User |
| `token_hash` | `CharField` | No | No |  |
| `expires_at` | `DateTimeField` | No | No |  |
| `used_at` | `DateTimeField` | Si | No |  |
| `ip_address` | `GenericIPAddressField` | Si | No |  |
| `user_agent` | `TextField` | No | No |  |
| `created_at` | `DateTimeField` | No | No |  |

#### `security_emailverificationtoken` - `EmailVerificationToken`

- Registros actuales: **0**
- Descripcion: EmailVerificationToken(id, user, token_hash, expires_at, used_at, created_at)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `user` | `FK` | No | No | accounts.User |
| `token_hash` | `CharField` | No | No |  |
| `expires_at` | `DateTimeField` | No | No |  |
| `used_at` | `DateTimeField` | Si | No |  |
| `created_at` | `DateTimeField` | No | No |  |

#### `security_loginattempt` - `LoginAttempt`

- Registros actuales: **47**
- Descripcion: LoginAttempt(id, email, user, success, failure_reason, ip_address, user_agent, created_at)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `email` | `CharField` | No | No |  |
| `user` | `FK` | Si | No | accounts.User |
| `success` | `BooleanField` | No | No |  |
| `failure_reason` | `CharField` | No | No |  |
| `ip_address` | `GenericIPAddressField` | Si | No |  |
| `user_agent` | `TextField` | No | No |  |
| `created_at` | `DateTimeField` | No | No |  |

#### `security_accountlock` - `AccountLock`

- Registros actuales: **4**
- Descripcion: AccountLock(id, user, locked_until, reason, failed_attempts, active, created_at, unlocked_at, unlocked_by)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `user` | `FK` | No | No | accounts.User |
| `locked_until` | `DateTimeField` | No | No |  |
| `reason` | `CharField` | No | No |  |
| `failed_attempts` | `PositiveIntegerField` | No | No |  |
| `active` | `BooleanField` | No | No |  |
| `created_at` | `DateTimeField` | No | No |  |
| `unlocked_at` | `DateTimeField` | Si | No |  |
| `unlocked_by` | `FK` | Si | No | accounts.User |

#### `security_usersession` - `UserSession`

- Registros actuales: **29**
- Descripcion: UserSession(id, user, session_key, refresh_token_hash, ip_address, user_agent, device_name, last_activity_at, expires_at, revoked_at, revoked_by, active, created_at)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `user` | `FK` | No | No | accounts.User |
| `session_key` | `CharField` | No | Si |  |
| `refresh_token_hash` | `CharField` | No | No |  |
| `ip_address` | `GenericIPAddressField` | Si | No |  |
| `user_agent` | `TextField` | No | No |  |
| `device_name` | `CharField` | No | No |  |
| `last_activity_at` | `DateTimeField` | No | No |  |
| `expires_at` | `DateTimeField` | No | No |  |
| `revoked_at` | `DateTimeField` | Si | No |  |
| `revoked_by` | `FK` | Si | No | accounts.User |
| `active` | `BooleanField` | No | No |  |
| `created_at` | `DateTimeField` | No | No |  |

#### `security_securitysetting` - `SecuritySetting`

- Registros actuales: **1**
- Descripcion: SecuritySetting(id, clinic, password_min_length, password_require_uppercase, password_require_lowercase, password_require_number, password_require_symbol, max_failed_login_attempts, lockout_minutes, password_reset_token_minutes, email_verification_token_minutes, session_lifetime_minutes, require_email_verification, active, created_at, updated_at)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `clinic` | `FK` | Si | No | clinics.Clinic |
| `password_min_length` | `PositiveIntegerField` | No | No |  |
| `password_require_uppercase` | `BooleanField` | No | No |  |
| `password_require_lowercase` | `BooleanField` | No | No |  |
| `password_require_number` | `BooleanField` | No | No |  |
| `password_require_symbol` | `BooleanField` | No | No |  |
| `max_failed_login_attempts` | `PositiveIntegerField` | No | No |  |
| `lockout_minutes` | `PositiveIntegerField` | No | No |  |
| `password_reset_token_minutes` | `PositiveIntegerField` | No | No |  |
| `email_verification_token_minutes` | `PositiveIntegerField` | No | No |  |
| `session_lifetime_minutes` | `PositiveIntegerField` | No | No |  |
| `require_email_verification` | `BooleanField` | No | No |  |
| `active` | `BooleanField` | No | No |  |
| `created_at` | `DateTimeField` | No | No |  |
| `updated_at` | `DateTimeField` | No | No |  |

### subscriptions

#### `subscriptions_subscriptionplan` - `SubscriptionPlan`

- Registros actuales: **3**
- Descripcion: SubscriptionPlan(id, creado_en, actualizado_en, name, code, description, price_monthly, price_yearly, max_users, max_doctors, max_patients, max_appointments_per_month, max_storage_mb, allow_billing, allow_inventory, allow_purchases, allow_reports, allow_audit, allow_notifications, allow_patient_portal, allow_mobile_api, allow_multi_branch, support_level, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `name` | `CharField` | No | No |  |
| `code` | `SlugField` | No | Si |  |
| `description` | `TextField` | No | No |  |
| `price_monthly` | `DecimalField` | No | No |  |
| `price_yearly` | `DecimalField` | No | No |  |
| `max_users` | `PositiveIntegerField` | No | No |  |
| `max_doctors` | `PositiveIntegerField` | No | No |  |
| `max_patients` | `PositiveIntegerField` | No | No |  |
| `max_appointments_per_month` | `PositiveIntegerField` | No | No |  |
| `max_storage_mb` | `PositiveIntegerField` | No | No |  |
| `allow_billing` | `BooleanField` | No | No |  |
| `allow_inventory` | `BooleanField` | No | No |  |
| `allow_purchases` | `BooleanField` | No | No |  |
| `allow_reports` | `BooleanField` | No | No |  |
| `allow_audit` | `BooleanField` | No | No |  |
| `allow_notifications` | `BooleanField` | No | No |  |
| `allow_patient_portal` | `BooleanField` | No | No |  |
| `allow_mobile_api` | `BooleanField` | No | No |  |
| `allow_multi_branch` | `BooleanField` | No | No |  |
| `support_level` | `CharField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

#### `subscriptions_clinicsubscription` - `ClinicSubscription`

- Registros actuales: **6**
- Descripcion: ClinicSubscription(id, creado_en, actualizado_en, clinic, plan, status, billing_cycle, start_date, end_date, trial_end_date, next_payment_date, cancelled_at, suspension_reason, notes, active)

| Campo | Tipo | Nulo | Unico | Relacion |
|---|---:|:---:|:---:|---|
| `id` | `BigAutoField` | No | Si |  |
| `creado_en` | `DateTimeField` | No | No |  |
| `actualizado_en` | `DateTimeField` | No | No |  |
| `clinic` | `FK` | No | Si | clinics.Clinic |
| `plan` | `FK` | No | No | subscriptions.SubscriptionPlan |
| `status` | `CharField` | No | No |  |
| `billing_cycle` | `CharField` | No | No |  |
| `start_date` | `DateField` | No | No |  |
| `end_date` | `DateField` | Si | No |  |
| `trial_end_date` | `DateField` | Si | No |  |
| `next_payment_date` | `DateField` | Si | No |  |
| `cancelled_at` | `DateTimeField` | Si | No |  |
| `suspension_reason` | `TextField` | No | No |  |
| `notes` | `TextField` | No | No |  |
| `active` | `BooleanField` | No | No |  |

## Tablas internas de Django

| App | Modelo | Tabla | Registros |
|---|---|---|---:|
| admin | LogEntry | `django_admin_log` | 0 |
| auth | Permission | `auth_permission` | 204 |
| auth | Group | `auth_group` | 0 |
| contenttypes | ContentType | `django_content_type` | 51 |
| sessions | Session | `django_session` | 0 |

## Lectura rapida por dominio

- **Tenant/SaaS**: `clinics_clinic`, `subscriptions_*`, `clinic_settings_clinicsettings`.
- **Usuarios y permisos**: `accounts_role`, `accounts_user`, mas tablas internas `auth_*`.
- **Paciente**: `patients_patient`, con `user` opcional para portal/app de pacientes.
- **Operacion clinica**: citas, admisiones, triaje, consulta, signos vitales y expediente.
- **Facturacion**: servicios, facturas, items, pagos, caja y movimientos.
- **Inventario y compras**: productos, lotes, movimientos, proveedores, ordenes y recepciones.
- **Seguridad/auditoria**: sesiones, intentos, bloqueos, tokens, logs y notificaciones.

## Observaciones tecnicas

- La base esta organizada como SaaS multi-clinica: la mayoria de tablas operativas apuntan a `clinics_clinic`.
- El usuario paciente se relaciona con `patients_patient` mediante `user` opcional, permitiendo portal/app de pacientes.
- En MySQL, algunos constraints condicionales de Django no se crean nativamente; por eso se refuerzan en serializers/API.
- El flujo clinico principal es: `Appointment` o admision directa -> `PatientVisit` -> `ClinicalConsultation` -> facturacion/consumos/documentos.