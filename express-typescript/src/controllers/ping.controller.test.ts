import PingController from "./ping.controller";

test("it should pass", async () => {
    const controller = new PingController();
    const response = await controller.getMessage();
    expect(response.message).toBe("pong");
});