<?php
// Izinkan koneksi ke sertifikat internal mailserver
$config['imap_conn_options'] = array(
    'ssl' => array(
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true,
    ),
);
$config['smtp_conn_options'] = array(
    'ssl' => array(
        'verify_peer' => false,
        'verify_peer_name' => false,
        'allow_self_signed' => true,
    ),
);

// ==============================================================================
// ROUNDCUBE PASSWORD PLUGIN CONFIGURATION (SELF-SERVICE PASSWORD CHANGE)
// ==============================================================================
// Pastikan plugin password aktif
if (!isset($config['plugins']) || !is_array($config['plugins'])) {
    $config['plugins'] = [];
}
if (!in_array('password', $config['plugins'])) {
    $config['plugins'][] = 'password';
}

// Gunakan driver resmi httpapi yang terhubung ke mediator internal (mail_net)
$config['password_driver'] = 'httpapi';
$config['password_httpapi_url'] = 'http://mail-passwd-helper:8000/password';
$config['password_httpapi_method'] = 'POST';
$config['password_httpapi_var_user'] = 'user';
$config['password_httpapi_var_curpass'] = 'curpass';
$config['password_httpapi_var_newpass'] = 'newpass';
$config['password_httpapi_expect'] = '/^ok$/i';

// Kebijakan Keamanan Password
$config['password_confirm_current'] = true; // Wajib verifikasi password saat ini
$config['password_minimum_length'] = 12;   // Minimal 12 karakter
$config['password_log'] = false;           // Dilarang mencatat password ke log (Constraint 5 & 12)

