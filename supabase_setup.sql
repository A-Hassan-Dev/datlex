
    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        email TEXT,
        password TEXT,
        allowed_location_ids TEXT,
        allowed_sector_ids TEXT,
        allowed_division_ids TEXT,
        allowed_menus TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO users (username, name, role, email, password)
    VALUES ('admin', 'Admin User', 'admin', 'admin@daltex.com', 'admin')
    ON CONFLICT (username) DO NOTHING;

    CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        unit TEXT,
        second_id TEXT,
        third_id TEXT,
        description2 TEXT,
        full_name TEXT,
        brand TEXT,
        oem TEXT,
        part_number TEXT,
        model_no TEXT,
        stock_quantity NUMERIC DEFAULT 0,
        quantities_by_location JSONB DEFAULT '{}'::jsonb,
        related_machine_id TEXT,
        location_zone TEXT,
        min_stock NUMERIC,
        max_stock NUMERIC,
        reorder_point NUMERIC,
        lead_time_days INTEGER,
        preferred_supplier TEXT,
        criticality TEXT,
        abc_class TEXT,
        status TEXT,
        unit_cost NUMERIC,
        annual_usage NUMERIC,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sectors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS divisions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sector_id TEXT REFERENCES sectors(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS machines (
        id TEXT PRIMARY KEY,
        machine_local_no TEXT,
        status TEXT,
        chase_no TEXT,
        model_no TEXT,
        division_id TEXT REFERENCES divisions(id),
        location_id TEXT,
        sector_id TEXT REFERENCES sectors(id),
        main_group TEXT,
        sub_group TEXT,
        category TEXT,
        brand TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS maintenance_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS issues (
        id TEXT PRIMARY KEY,
        timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        location_id TEXT REFERENCES locations(id),
        item_id TEXT REFERENCES items(id),
        item_name TEXT,
        quantity NUMERIC,
        unit TEXT,
        machine_id TEXT REFERENCES machines(id),
        machine_name TEXT,
        sector_name TEXT,
        division_name TEXT,
        maintenance_plan_id TEXT REFERENCES maintenance_plans(id),
        maintenance_plan TEXT, 
        status TEXT DEFAULT 'Pending',
        notes TEXT,
        warehouse_email TEXT, 
        requester_email TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS breakdowns (
        id TEXT PRIMARY KEY,
        machine_id TEXT REFERENCES machines(id),
        machine_name TEXT,
        location_id TEXT REFERENCES locations(id),
        sector_id TEXT REFERENCES sectors(id),
        division_id TEXT REFERENCES divisions(id),
        machine_local_no TEXT,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ,
        failure_type TEXT,
        operator_name TEXT,
        root_cause TEXT,
        action_taken TEXT,
        status TEXT DEFAULT 'Open',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bom (
        id TEXT PRIMARY KEY,
        machine_category TEXT,
        model_no TEXT,
        brand TEXT,
        item_id TEXT REFERENCES items(id),
        quantity NUMERIC,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );


    CREATE TABLE IF NOT EXISTS agri_orders (
        id TEXT PRIMARY KEY,
        date DATE,
        branch TEXT,
        tractor TEXT,
        machine_local_no TEXT,
        attached TEXT,
        attached_local_no TEXT,
        department TEXT,
        pivot TEXT,
        driver TEXT,
        start_counter NUMERIC,
        end_counter NUMERIC,
        row_number TEXT,
        unit_type TEXT,
        achievement NUMERIC,
        actual_or_return NUMERIC,
        calculated NUMERIC,
        time_spent NUMERIC,
        notes TEXT,
        sector TEXT,
        services TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS irrigation_logs (
        id TEXT PRIMARY KEY,
        date DATE,
        location_name TEXT,
        generator_model TEXT,
        engine_start NUMERIC,
        engine_end NUMERIC,
        total_hours NUMERIC,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forecast_periods (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        status TEXT DEFAULT 'Open',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS forecast_records (
        id TEXT PRIMARY KEY,
        period_id TEXT REFERENCES forecast_periods(id),
        location_id TEXT REFERENCES locations(id),
        sector_id TEXT REFERENCES sectors(id),
        division_id TEXT REFERENCES divisions(id),
        item_id TEXT REFERENCES items(id),
        quantity NUMERIC,
        last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_by TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS maintenance_tasks (
        id TEXT PRIMARY KEY,
        description TEXT,
        type TEXT,
        machine_id TEXT,
        machine_name TEXT,
        required_mro_items JSONB DEFAULT '[]'::jsonb,
        standard_duration_hours NUMERIC,
        required_skills TEXT,
        priority TEXT,
        default_location_id TEXT,
        status TEXT DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id TEXT PRIMARY KEY,
        task_id TEXT REFERENCES maintenance_tasks(id),
        machine_id TEXT,
        location_id TEXT,
        planned_start_date DATE,
        planned_end_date DATE,
        frequency TEXT,
        assigned_technician TEXT,
        check_mro_availability BOOLEAN DEFAULT FALSE,
        status TEXT DEFAULT 'Planned',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS maintenance_work_orders (
        id TEXT PRIMARY KEY,
        task_id TEXT REFERENCES maintenance_tasks(id),
        machine_id TEXT,
        location_id TEXT,
        type TEXT,
        planned_date DATE,
        actual_start_date TIMESTAMPTZ,
        actual_end_date TIMESTAMPTZ,
        planned_duration_hours NUMERIC,
        actual_duration_hours NUMERIC,
        mro_items_reserved BOOLEAN DEFAULT FALSE,
        mro_items_consumed JSONB DEFAULT '[]'::jsonb,
        status TEXT DEFAULT 'Draft',
        downtime_recorded_minutes INTEGER,
        root_cause TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS asset_transfers (
        id TEXT PRIMARY KEY,
        machine_id TEXT REFERENCES machines(id),
        current_location_id TEXT REFERENCES locations(id),
        target_location_id TEXT REFERENCES locations(id),
        transfer_type TEXT CHECK (transfer_type IN ('Internal', 'External maintenance')),
        requested_by TEXT REFERENCES users(username),
        reason_code TEXT,
        effective_date DATE,
        status TEXT DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Executed', 'Closed')),
        
        supplier_name TEXT,
        work_scope_notes TEXT,
        expected_return_date DATE,
        
        approved_by TEXT REFERENCES users(username),
        approval_timestamp TIMESTAMPTZ,
        rejection_reason TEXT,
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS machine_transfer_history (
        id TEXT PRIMARY KEY,
        date DATE,
        from_location_id TEXT REFERENCES locations(id),
        to_location_id TEXT REFERENCES locations(id),
        transfer_type TEXT,
        requested_by TEXT,
        approved_by TEXT,
        reference_change_id TEXT REFERENCES asset_transfers(id),
        notes TEXT,
        machine_id TEXT REFERENCES machines(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS warranty_management (
        id TEXT PRIMARY KEY,
        machine_id TEXT REFERENCES machines(id),
        supplier TEXT,
        warranty_start_date DATE,
        warranty_end_date DATE,
        warranty_type TEXT,
        coverage_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS warranty_receiving_data (
        id TEXT PRIMARY KEY,
        machine_id TEXT REFERENCES machines(id),
        received_date DATE,
        condition TEXT,
        reference_transfer_id TEXT REFERENCES asset_transfers(id),
        operating_hours NUMERIC,
        first_run_date_after_receipt DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );


    CREATE OR REPLACE FUNCTION fn_handle_asset_transfer_execution()
    RETURNS TRIGGER AS $$
    BEGIN
        IF (NEW.status = 'Executed' AND (OLD.status IS NULL OR OLD.status != 'Executed')) THEN
            
            UPDATE machines
            SET 
                location_id = NEW.target_location_id,
                status = CASE 
                    WHEN NEW.transfer_type = 'External maintenance' THEN 'Outside Maintenance'
                    ELSE 'Working' 
                END
            WHERE id = NEW.machine_id;

            INSERT INTO machine_transfer_history (
                id, date, from_location_id, to_location_id, transfer_type, 
                requested_by, approved_by, reference_change_id, notes, machine_id
            ) VALUES (
                'HIST-' || NEW.id,
                CURRENT_DATE,
                NEW.current_location_id,
                NEW.target_location_id,
                NEW.transfer_type,
                NEW.requested_by,
                NEW.approved_by,
                NEW.id,
                CASE WHEN NEW.transfer_type = 'External maintenance' THEN NEW.work_scope_notes ELSE 'Internal Transfer' END,
                NEW.machine_id
            );

        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_handle_asset_transfer_execution ON asset_transfers;
    CREATE TRIGGER trg_handle_asset_transfer_execution
    AFTER UPDATE ON asset_transfers
    FOR EACH ROW
    EXECUTE FUNCTION fn_handle_asset_transfer_execution();



    CREATE TABLE IF NOT EXISTS org_structure (
        id TEXT PRIMARY KEY,
        location_id TEXT REFERENCES locations(id),
        sector_id TEXT REFERENCES sectors(id),
        division_id TEXT REFERENCES divisions(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(location_id, sector_id, division_id)
    );

    CREATE TABLE IF NOT EXISTS failure_types (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        definition TEXT,
        cause TEXT,
        action TEXT,
        applicable_asset_type TEXT, 
        mandatory BOOLEAN DEFAULT FALSE,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS issue_plan_periods (
        id TEXT PRIMARY KEY,
        name TEXT,
        start_date DATE,
        end_date DATE,
        status TEXT DEFAULT 'Open',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS issue_plan_entries (
        id TEXT PRIMARY KEY,
        period_id TEXT REFERENCES issue_plan_periods(id),
        location_id TEXT REFERENCES locations(id),
        sector_id TEXT REFERENCES sectors(id),
        division_id TEXT REFERENCES divisions(id),
        
        item_id TEXT REFERENCES items(id),
        item_code TEXT,       
        description TEXT,
        unit TEXT,
        
        machine_name TEXT,
        brand TEXT,
        model TEXT,
        machine_main_group TEXT,
        
        pcs_per_machine NUMERIC DEFAULT 1,
        machine_count NUMERIC DEFAULT 0,
        actual_quantity NUMERIC DEFAULT 0, 
        forecast_quantity NUMERIC DEFAULT 0, 
        
        notes TEXT,
        updated_by TEXT,
        last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_location_ids TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_sector_ids TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_division_ids TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS allowed_menus TEXT;

    ALTER TABLE items ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;

    ALTER TABLE machines ADD COLUMN IF NOT EXISTS chassis_no TEXT;

    ALTER TABLE bom ADD COLUMN IF NOT EXISTS maintenance_type TEXT;
    ALTER TABLE bom ADD COLUMN IF NOT EXISTS brand TEXT;
    ALTER TABLE bom ADD COLUMN IF NOT EXISTS sort_order INTEGER;

    ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ; 
    ALTER TABLE breakdowns ADD COLUMN IF NOT EXISTS duration_minutes NUMERIC; 

    ALTER TABLE issues ADD COLUMN IF NOT EXISTS gl_date DATE;
    ALTER TABLE issues ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'Pending'; 
    ALTER TABLE issues ADD COLUMN IF NOT EXISTS manager_approved_by TEXT;
    ALTER TABLE issues ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ;
    ALTER TABLE issues ADD COLUMN IF NOT EXISTS calculated_total_cost NUMERIC; 

    ALTER TABLE issues DROP CONSTRAINT IF EXISTS issues_machine_id_fkey;
    ALTER TABLE issues ADD CONSTRAINT issues_machine_id_fkey FOREIGN KEY (machine_id) REFERENCES machines(id);

        
