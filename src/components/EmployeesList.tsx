"use client";

import { useEffect, useState } from "react";
import EvaluationForm from "@/components/EvaluationForm";

type Employee = {
    id: number;
    name: string;
    email: string;
    position_name: string;
};

type EmployeesListProps = {
    leaderId: string;
};

export default function EmployeesList({
    leaderId,
}: EmployeesListProps) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const controller = new AbortController();

        async function loadEmployees() {
            setLoading(true);
            setError(null);
            setEmployees([]);
            setSelectedEmployee(null);

            try {
                const response = await fetch("/api/employees", {
                    headers: {
                        "X-Leader-ID": leaderId,
                    },
                    signal: controller.signal,
                    cache: "no-store",
                });

                if (!response.ok) {
                    throw new Error("Falha ao consultar os funcionários.");
                }

                const data: Employee[] = await response.json();

                if (!controller.signal.aborted) {
                    setEmployees(data);
                }
            } catch {
                if (!controller.signal.aborted) {
                    setError("Não foi possível carregar os funcionários.");
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadEmployees();

        return () => controller.abort();
    }, [leaderId]);

    return (
        <section
            aria-labelledby="employees-title"
            className="mt-8 border-t border-slate-200 pt-6"
        >
            <h2 id="employees-title" className="text-xl font-semibold">
                Funcionários da equipe
            </h2>

            <p className="mt-1 text-sm text-slate-600">
                Subordinados diretos e indiretos que você pode avaliar.
            </p>

            {loading && (
                <p className="mt-4" role="status">
                    Carregando funcionários...
                </p>
            )}

            {error && (
                <p className="mt-4 text-red-700" role="alert">
                    {error}
                </p>
            )}

            {!loading && !error && !selectedEmployee && (
                <>
                    <p className="mt-4 text-sm text-slate-600" role="status">
                        {employees.length === 0
                            ? "Nenhum subordinado encontrado."
                            : `Funcionários encontrados: ${employees.length}`}
                    </p>

                    <ul className="mt-4 space-y-3">
                        {employees.map((employee) => (
                            <li
                                key={employee.id}
                                className="rounded-lg border border-slate-200 p-4"
                            >
                                <h3 className="font-semibold">{employee.name}</h3>

                                <p className="text-sm text-slate-600">
                                    {employee.position_name}
                                </p>

                                <p className="mt-1 break-all text-sm text-slate-500">
                                    {employee.email}
                                </p>

                                <button
                                    type="button"
                                    onClick={() => setSelectedEmployee(employee)}
                                    aria-label={`Avaliar ${employee.name}`}
                                    className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
                                >
                                    Avaliar
                                </button>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {!loading && !error && selectedEmployee && (
                <div className="mt-6 rounded-lg border border-slate-200 p-5">
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={() => setSelectedEmployee(null)}
                        className="text-sm font-medium text-blue-700 underline disabled:cursor-wait disabled:opacity-50"
                    >
                        Voltar para a equipe
                    </button>

                    <h3 className="mt-4 text-lg font-semibold">
                        Avaliar {selectedEmployee.name}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                        {selectedEmployee.position_name}
                    </p>

                    <EvaluationForm
                        key={`${leaderId}-${selectedEmployee.id}`}
                        leaderId={leaderId}
                        employeeId={selectedEmployee.id}
                        onSubmittingChange={setSubmitting}
                    />
                </div>
            )}
        </section>
    );
}