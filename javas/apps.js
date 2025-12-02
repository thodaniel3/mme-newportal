// Import Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// Initialize Supabase client
const supabaseUrl = 'https://ldakeveujleriwunzyfe.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkYWtldmV1amxlcml3dW56eWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5Mjk0ODQsImV4cCI6MjA3OTUwNTQ4NH0.kkIHAMcCxe8M0xH0YPMo9AM-Ntax3NSgObyFRrqSSd4'
const supabase = createClient(supabaseUrl, supabaseKey)

// ===============================
// FORM SUBMIT HANDLER
// ===============================
document.getElementById('mmeForm').addEventListener('submit', async (e) => {
    e.preventDefault()

    const submitBtn = document.getElementById('submitBtn')
    const errorMsg = document.getElementById('errorMsg')
    const successMsg = document.getElementById('successMsg')

    // Reset messages
    errorMsg.textContent = ''
    successMsg.style.display = 'none'

    // Get form values
    const formData = {
        full_name: document.getElementById('fullName').value.trim(),
        matric_number: document.getElementById('matric').value.trim(),
        date_of_birth: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        phone: document.getElementById('phone').value.trim(),
        level: document.getElementById('level').value,
        state_of_origin: document.getElementById('state').value,
        hobbies: document.getElementById('hobbies').value.trim(),
        reality_answer: document.getElementById('reality').value.trim(),
        comments: document.getElementById('comments').value.trim(),
        passport_url: ''
    }

    if (!formData.full_name || !formData.matric_number || !formData.date_of_birth) {
        errorMsg.textContent = 'Please fill in all required fields'
        return
    }

    try {
        submitBtn.disabled = true
        submitBtn.textContent = 'Submitting...'

        // ===============================
        // HANDLE PASSPORT UPLOAD
        // ===============================
        const passportFile = document.getElementById('passport').files[0]
        let passportUrl = ''

        if (passportFile) {

            if (passportFile.size > 20000) {
                errorMsg.textContent = 'Passport image must be less than 20KB'
                submitBtn.disabled = false
                submitBtn.textContent = 'Submit'
                return
            }

            const ext = passportFile.name.split('.').pop()
            const fileName = `${formData.matric_number}_${Date.now()}.${ext}`
            const filePath = `passports/${fileName}`

            // Upload to CORRECT bucket name (FIXED)
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('STUDENTS_PASSPORTS')
                .upload(filePath, passportFile, {
                    cacheControl: '3600',
                    upsert: false
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                errorMsg.textContent = 'Passport upload failed. Check Supabase bucket permissions.'
                submitBtn.disabled = false
                submitBtn.textContent = 'Submit'
                return
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('STUDENTS_PASSPORTS')
                .getPublicUrl(filePath)

            passportUrl = publicUrlData.publicUrl
        }

        formData.passport_url = passportUrl

        console.log('Submitting data:', formData)

        // Insert into DB
        const { data, error } = await supabase
            .from('students')
            .insert([formData])

        if (error) {
            console.error('Insert error:', error)
            errorMsg.textContent = `Error: ${error.message}`
        } else {
            successMsg.style.display = 'block'
            submitBtn.textContent = 'Submitted!'

            setTimeout(() => {
                window.location.href = "dashboard.html"
            }, 1000)
        }

    } catch (err) {
        console.error('Unexpected error:', err)
        errorMsg.textContent = 'Unexpected error. Try again.'
    } finally {
        submitBtn.disabled = false
        submitBtn.textContent = 'Submit'
    }
})

console.log('MME Student Form loaded successfully')
