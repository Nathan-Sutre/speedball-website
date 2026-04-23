import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const dataPath = join(process.cwd(), "data", "data.json");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { tournamentType, tournamentName, tournamentDate } = body;

    // Validation
    if (!tournamentType || !tournamentName || !tournamentDate) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Read current data
    const data = JSON.parse(readFileSync(dataPath, "utf-8"));

    // Generate tournament ID
    const tournamentTypePrefix = tournamentType === "sbl" ? "sbl" : "sbc";
    const existingCount = data.tournaments.filter((t: any) =>
      t.id.startsWith(tournamentTypePrefix),
    ).length;
    const newId = `${tournamentTypePrefix}-${existingCount + 1}`;

    // Create new tournament
    const newTournament = {
      id: newId,
      name: tournamentName,
      date: tournamentDate,
      phases: [],
    };

    // Add to tournaments array
    data.tournaments.push(newTournament);

    // Write back to file
    writeFileSync(dataPath, JSON.stringify(data, null, 2));

    return Response.json(newTournament, { status: 201 });
  } catch (error) {
    console.error("Error creating tournament:", error);
    return Response.json(
      { error: "Failed to create tournament" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const data = JSON.parse(readFileSync(dataPath, "utf-8"));
    return Response.json(data.tournaments);
  } catch (error) {
    return Response.json([], { status: 500 });
  }
}
